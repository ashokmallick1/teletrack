package io.callyzer.android.data.source

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.provider.CallLog
import androidx.core.content.ContextCompat
import io.callyzer.android.data.model.CallDirection
import io.callyzer.android.data.model.CallOutcome
import io.callyzer.android.data.model.CallRecord
import io.callyzer.android.data.model.DataSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Adapter that reads call records from Android CallLog.Calls provider.
 * Strictly adheres to Android runtime permissions and does not use hidden APIs,
 * accessibility workarounds, root, or covert collection.
 */
class AuthorizedCallLogDataSource : CallDataSource {

    override val sourceType: DataSource = DataSource.NATIVE_CALL_LOG

    override fun getCapabilities(): DataSourceCapabilities {
        return DataSourceCapabilities(
            supportsAutomatedPolling = true,
            supportsSimMetadata = true,
            requiresRuntimePermission = true,
            permissionName = Manifest.permission.READ_CALL_LOG,
            isLegallyAuthorizedInCurrentBuild = true
        )
    }

    override fun isAvailable(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CALL_LOG
        ) == PackageManager.PERMISSION_GRANTED
    }

    override suspend fun fetchCallEvents(
        context: Context,
        sinceTimestamp: Long,
        limit: Int
    ): List<CallRecord> = withContext(Dispatchers.IO) {
        if (!isAvailable(context)) {
            return@withContext emptyList()
        }

        val records = mutableListOf<CallRecord>()

        val projection = arrayOf(
            CallLog.Calls._ID,
            CallLog.Calls.NUMBER,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION,
            CallLog.Calls.TYPE,
            CallLog.Calls.PHONE_ACCOUNT_ID
        )

        // Query calls. If sinceTimestamp > 0, filter DATE > sinceTimestamp; otherwise collect all history
        val selection = if (sinceTimestamp > 0) "${CallLog.Calls.DATE} > ?" else null
        val selectionArgs = if (sinceTimestamp > 0) arrayOf(sinceTimestamp.toString()) else null
        val sortOrder = "${CallLog.Calls.DATE} DESC"

        var cursor: Cursor? = null
        try {
            android.util.Log.d("CallyzerCallLog", "Querying call logs (sinceTimestamp=$sinceTimestamp, limit=$limit)...")
            cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )

            cursor?.let { c ->
                val idIdx = c.getColumnIndex(CallLog.Calls._ID)
                val numberIdx = c.getColumnIndex(CallLog.Calls.NUMBER)
                val dateIdx = c.getColumnIndex(CallLog.Calls.DATE)
                val durationIdx = c.getColumnIndex(CallLog.Calls.DURATION)
                val typeIdx = c.getColumnIndex(CallLog.Calls.TYPE)
                val accountIdx = c.getColumnIndex(CallLog.Calls.PHONE_ACCOUNT_ID)

                while (c.moveToNext()) {
                    if (limit > 0 && records.size >= limit) {
                        break
                    }

                    val rawId = if (idIdx >= 0) c.getString(idIdx) else null ?: continue
                    val rawNumber = if (numberIdx >= 0) c.getString(numberIdx) else null
                    val date = if (dateIdx >= 0) c.getLong(dateIdx) else 0L
                    val duration = if (durationIdx >= 0) c.getLong(durationIdx) else 0L
                    val callType = if (typeIdx >= 0) c.getInt(typeIdx) else CallLog.Calls.INCOMING_TYPE
                    val phoneAccount = if (accountIdx >= 0) c.getString(accountIdx) else null

                    val (direction, outcome, confidence) = mapCallTypeAndDuration(callType, duration)

                    val cleanNumber = when {
                        rawNumber.isNullOrBlank() -> "UNKNOWN_NUMBER"
                        rawNumber == "-1" || rawNumber == "-2" -> "PRIVATE_NUMBER"
                        else -> rawNumber.trim()
                    }

                    records.add(
                        CallRecord(
                            sourceCallId = "calllog_$rawId",
                            direction = direction,
                            durationSeconds = duration,
                            startedAt = date,
                            endedAt = if (duration > 0) date + (duration * 1000) else null,
                            outcome = outcome,
                            outcomeConfidence = confidence,
                            phoneNumber = cleanNumber,
                            phoneAccount = phoneAccount,
                            dataSource = DataSource.NATIVE_CALL_LOG,
                            rawMetadata = mapOf(
                                "systemCallType" to callType.toString(),
                                "phoneAccountId" to (phoneAccount ?: "default")
                            )
                        )
                    )
                }
                android.util.Log.d("CallyzerCallLog", "Successfully read ${records.size} call logs from device")
            }
        } catch (e: SecurityException) {
            android.util.Log.e("CallyzerCallLog", "READ_CALL_LOG permission not granted: ${e.message}")
            return@withContext emptyList()
        } catch (e: Exception) {
            android.util.Log.e("CallyzerCallLog", "Error reading call logs: ${e.message}", e)
        } finally {
            cursor?.close()
        }

        return@withContext records
    }

    private fun mapCallTypeAndDuration(callType: Int, duration: Long): Triple<CallDirection, CallOutcome, Float> {
        return when (callType) {
            CallLog.Calls.INCOMING_TYPE -> {
                if (duration > 0) {
                    Triple(CallDirection.INCOMING, CallOutcome.ANSWERED, 1.0f)
                } else {
                    Triple(CallDirection.INCOMING, CallOutcome.MISSED, 0.9f)
                }
            }
            CallLog.Calls.OUTGOING_TYPE -> {
                if (duration > 0) {
                    Triple(CallDirection.OUTGOING, CallOutcome.ANSWERED, 1.0f)
                } else {
                    Triple(CallDirection.OUTGOING, CallOutcome.FAILED, 0.85f)
                }
            }
            CallLog.Calls.MISSED_TYPE -> {
                Triple(CallDirection.MISSED, CallOutcome.MISSED, 1.0f)
            }
            CallLog.Calls.REJECTED_TYPE -> {
                Triple(CallDirection.REJECTED, CallOutcome.REJECTED, 1.0f)
            }
            CallLog.Calls.BLOCKED_TYPE -> {
                Triple(CallDirection.INCOMING, CallOutcome.REJECTED, 0.95f)
            }
            CallLog.Calls.VOICEMAIL_TYPE -> {
                Triple(CallDirection.INCOMING, CallOutcome.ANSWERED, 0.9f)
            }
            else -> {
                Triple(CallDirection.UNKNOWN, CallOutcome.UNKNOWN, 0.5f)
            }
        }
    }
}
