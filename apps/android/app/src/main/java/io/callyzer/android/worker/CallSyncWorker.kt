package io.callyzer.android.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import io.callyzer.android.data.local.AppDatabase
import io.callyzer.android.data.model.SyncStatus
import io.callyzer.android.data.remote.ApiClient
import io.callyzer.android.data.remote.IngestBatchRequest
import io.callyzer.android.data.remote.IngestCallEventDto
import io.callyzer.android.security.TokenStorage
import java.text.SimpleDateFormat
import java.util.*

class CallSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val database = AppDatabase.getInstance(appContext)
    private val dao = database.queuedCallEventDao()
    private val tokenStorage = TokenStorage(appContext)
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    override suspend fun doWork(): Result {
        val apiKey = tokenStorage.deviceApiKey
        if (apiKey.isNullOrBlank()) {
            tokenStorage.lastSyncStatus = "Failed: Device not enrolled"
            return Result.failure()
        }

        val pending = dao.getPendingEvents(limit = 50)
        if (pending.isEmpty()) {
            tokenStorage.lastSyncTimestamp = System.currentTimeMillis()
            tokenStorage.lastSyncStatus = "Up to date (Queue empty)"
            return Result.success()
        }

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

        val apiService = ApiClient.getService(tokenStorage.baseUrl)

        return try {
            val response = apiService.uploadCallBatch(apiKey, request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                dao.updateSyncStatus(ids, SyncStatus.SYNCED)
                tokenStorage.lastSyncTimestamp = System.currentTimeMillis()
                tokenStorage.lastSyncStatus = "Synced ${body.inserted} new (${body.duplicates} duplicate)"
                Result.success()
            } else {
                val errorMsg = "HTTP ${response.code()}: ${response.message()}"
                dao.markFailedWithRetry(ids, errorMsg)
                tokenStorage.lastSyncStatus = errorMsg
                if (response.code() in 500..599) {
                    Result.retry()
                } else {
                    Result.failure()
                }
            }
        } catch (e: Exception) {
            val errorMsg = e.localizedMessage ?: "Network connection failed"
            dao.markFailedWithRetry(ids, errorMsg)
            tokenStorage.lastSyncStatus = errorMsg
            Result.retry()
        }
    }
}
