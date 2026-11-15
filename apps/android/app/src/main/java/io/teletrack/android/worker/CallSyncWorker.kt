package io.teletrack.android.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import io.teletrack.android.data.local.AppDatabase
import io.teletrack.android.data.model.SyncStatus
import io.teletrack.android.data.remote.ApiClient
import io.teletrack.android.data.remote.IngestBatchRequest
import io.teletrack.android.data.remote.IngestCallEventDto
import io.teletrack.android.security.TokenStorage
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

        return try {
            val repository = io.teletrack.android.repository.CallRepository(applicationContext)
            val result = repository.syncNowDirect()
            android.util.Log.d("TeleTrackWorker", "CallSyncWorker result: $result")
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("TeleTrackWorker", "CallSyncWorker error: ${e.message}", e)
            Result.retry()
        }
    }
}
