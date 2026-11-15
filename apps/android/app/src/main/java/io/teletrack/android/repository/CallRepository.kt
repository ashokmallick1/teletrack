package io.teletrack.android.repository

import android.content.Context
import androidx.work.*
import io.teletrack.android.data.local.AppDatabase
import io.teletrack.android.data.local.QueuedCallEventEntity
import io.teletrack.android.data.model.CallRecord
import io.teletrack.android.data.model.DataSource
import io.teletrack.android.data.model.SyncStatus
import io.teletrack.android.data.remote.ApiClient
import io.teletrack.android.data.remote.AssignedLeadDto
import io.teletrack.android.data.remote.IngestBatchRequest
import io.teletrack.android.data.remote.IngestCallEventDto
import io.teletrack.android.data.remote.ServerHealthResponse
import io.teletrack.android.data.source.AuthorizedCallLogDataSource
import io.teletrack.android.data.source.CallDataSource
import io.teletrack.android.security.TokenStorage
import io.teletrack.android.worker.CallSyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class CallRepository(
    private val context: Context,
    private val database: AppDatabase = AppDatabase.getInstance(context),
    val callLogDataSource: CallDataSource = AuthorizedCallLogDataSource()
) {

    private val dao = database.queuedCallEventDao()
    private val tokenStorage = TokenStorage(context)

    fun observePendingCount(): Flow<Int> = dao.observePendingCount()

    fun observeRecentEvents(limit: Int = 20): Flow<List<QueuedCallEventEntity>> =
        dao.observeRecentEvents(limit)

    suspend fun pollCallLogAndQueue(forceAll: Boolean = false): Int = withContext(Dispatchers.IO) {
        if (!callLogDataSource.isAvailable(context)) {
            return@withContext 0
        }

        // When forceAll is requested or database is empty, start from 0L so ALL call history present on the handset is imported
        val latestTimestamp = if (forceAll) 0L else (dao.getLatestEventTimestamp() ?: 0L)

        val records = callLogDataSource.fetchCallEvents(
            context = context,
            sinceTimestamp = latestTimestamp,
            limit = 5000
        )

        if (records.isEmpty()) return@withContext 0

        val entities = records.map { r ->
            QueuedCallEventEntity(
                sourceCallId = r.sourceCallId,
                direction = r.direction,
                durationSeconds = r.durationSeconds,
                startedAt = r.startedAt,
                endedAt = r.endedAt,
                outcome = r.outcome,
                outcomeConfidence = r.outcomeConfidence,
                phoneNumber = r.phoneNumber,
                simSlot = r.simSlot,
                simCarrier = r.simCarrier,
                phoneAccount = r.phoneAccount,
                dataSource = r.dataSource,
                syncStatus = SyncStatus.PENDING
            )
        }

        val inserted = dao.insertAll(entities)
        val newCount = inserted.count { it > 0 }

        if (newCount > 0) {
            triggerBackgroundSync()
        }

        return@withContext newCount
    }

    suspend fun recordManualCall(record: CallRecord): Long = withContext(Dispatchers.IO) {
        val entity = QueuedCallEventEntity(
            sourceCallId = record.sourceCallId,
            direction = record.direction,
            durationSeconds = record.durationSeconds,
            startedAt = record.startedAt,
            endedAt = record.endedAt,
            outcome = record.outcome,
            outcomeConfidence = 1.0f,
            phoneNumber = record.phoneNumber,
            dataSource = DataSource.MANUAL_ENTRY,
            syncStatus = SyncStatus.PENDING
        )
        val id = dao.insert(entity)
        if (id > 0) {
            triggerBackgroundSync()
        }
        return@withContext id
    }

    suspend fun pingServer(targetUrl: String? = null): Result<ServerHealthResponse> = withContext(Dispatchers.IO) {
        try {
            val api = ApiClient.getService(targetUrl ?: tokenStorage.baseUrl)
            val response = api.checkHealth()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("HTTP ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchAssignedLeads(): List<AssignedLeadDto> = withContext(Dispatchers.IO) {
        val apiKey = tokenStorage.deviceApiKey ?: return@withContext emptyList()
        try {
            val api = ApiClient.getService(tokenStorage.baseUrl)
            val response = api.getAssignedLeads(apiKey)
            if (response.isSuccessful && response.body() != null) {
                response.body()!!
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun syncNowDirect(forceAll: Boolean = false): String = withContext(Dispatchers.IO) {
        val apiKey = tokenStorage.deviceApiKey
        if (apiKey.isNullOrBlank()) {
            return@withContext "Error: Device not enrolled"
        }

        // 1. If forceAll is requested, reset all local calls to PENDING so everything is re-verified with server
        if (forceAll) {
            dao.resetAllToPending()
        }

        // 2. Poll all native call logs from device
        val newPolled = pollCallLogAndQueue(forceAll = forceAll)

        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        var totalUploaded = 0
        var totalDuplicates = 0
        var lastError: String? = null

        // 2. Loop until all pending events are ingested into server
        while (true) {
            val pending = dao.getPendingEvents(limit = 100)
            if (pending.isEmpty()) break

            val ids = pending.map { it.id }
            dao.updateSyncStatus(ids, SyncStatus.SYNCING)

            val dtos = pending.map { evt ->
                IngestCallEventDto(
                    sourceCallId = evt.sourceCallId,
                    direction = evt.direction.name,
                    durationSeconds = evt.durationSeconds,
                    startedAt = isoFormat.format(Date(evt.startedAt)),
                    endedAt = evt.endedAt?.let { isoFormat.format(Date(it)) },
                    outcome = evt.outcome.name,
                    outcomeConfidence = evt.outcomeConfidence,
                    phoneNumber = evt.phoneNumber,
                    simSlot = evt.simSlot,
                    simCarrier = evt.simCarrier,
                    phoneAccount = evt.phoneAccount,
                    dataSource = evt.dataSource.name
                )
            }

            val request = IngestBatchRequest(
                clientTimestamp = isoFormat.format(Date()),
                events = dtos
            )

            try {
                val apiService = ApiClient.getService(tokenStorage.baseUrl)
                val response = apiService.uploadCallBatch(apiKey, request)
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    dao.updateSyncStatus(ids, SyncStatus.SYNCED)
                    totalUploaded += body.inserted
                    totalDuplicates += body.duplicates
                } else {
                    val err = "Upload failed: HTTP ${response.code()} ${response.message()}"
                    dao.markFailedWithRetry(ids, err)
                    lastError = err
                    if (response.code() == 401) {
                        tokenStorage.deviceApiKey = null
                        tokenStorage.deviceId = null
                    }
                    break
                }
            } catch (e: Exception) {
                val err = "Upload error: ${e.localizedMessage ?: "Connection error"}"
                dao.markFailedWithRetry(ids, err)
                lastError = err
                break
            }
        }

        tokenStorage.lastSyncTimestamp = System.currentTimeMillis()

        if (lastError != null && totalUploaded == 0) {
            tokenStorage.lastSyncStatus = lastError
            return@withContext lastError
        }

        val statusText = if (totalUploaded > 0 || totalDuplicates > 0) {
            "Synced $totalUploaded new call(s) ($totalDuplicates existing)"
        } else if (newPolled > 0) {
            "Found $newPolled calls (queued)"
        } else {
            "All call records up to date"
        }
        tokenStorage.lastSyncStatus = statusText
        return@withContext statusText
    }

    fun triggerBackgroundSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWork = OneTimeWorkRequestBuilder<CallSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "TeleTrackCallSyncWork",
            ExistingWorkPolicy.REPLACE,
            syncWork
        )
    }

    fun schedulePeriodicSync(intervalMinutes: Long = 15) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val periodicWork = PeriodicWorkRequestBuilder<CallSyncWorker>(
            intervalMinutes,
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "TeleTrackPeriodicCallSync",
            ExistingPeriodicWorkPolicy.KEEP,
            periodicWork
        )
    }
}
