package io.teletrack.android.data.local

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import io.teletrack.android.data.model.CallDirection
import io.teletrack.android.data.model.CallOutcome
import io.teletrack.android.data.model.DataSource
import io.teletrack.android.data.model.SyncStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

open class AppDatabase(context: Context) : SQLiteOpenHelper(context.applicationContext, DATABASE_NAME, null, DATABASE_VERSION) {

    private val changeSignal = MutableStateFlow(System.currentTimeMillis())

    private val dao = object : QueuedCallEventDao {

        override suspend fun insert(event: QueuedCallEventEntity): Long {
            val db = writableDatabase
            val values = ContentValues().apply {
                put("sourceCallId", event.sourceCallId)
                put("direction", event.direction.name)
                put("durationSeconds", event.durationSeconds)
                put("startedAt", event.startedAt)
                put("endedAt", event.endedAt)
                put("outcome", event.outcome.name)
                put("outcomeConfidence", event.outcomeConfidence)
                put("phoneNumber", event.phoneNumber)
                put("simSlot", event.simSlot)
                put("simCarrier", event.simCarrier)
                put("phoneAccount", event.phoneAccount)
                put("dataSource", event.dataSource.name)
                put("syncStatus", event.syncStatus.name)
                put("retryCount", event.retryCount)
                put("lastError", event.lastError)
                put("createdAt", event.createdAt)
            }
            val id = db.insertWithOnConflict("queued_call_events", null, values, SQLiteDatabase.CONFLICT_IGNORE)
            if (id > 0) notifyChanged()
            return id
        }

        override suspend fun insertAll(events: List<QueuedCallEventEntity>): List<Long> {
            val db = writableDatabase
            val results = mutableListOf<Long>()
            db.beginTransaction()
            try {
                for (event in events) {
                    val values = ContentValues().apply {
                        put("sourceCallId", event.sourceCallId)
                        put("direction", event.direction.name)
                        put("durationSeconds", event.durationSeconds)
                        put("startedAt", event.startedAt)
                        put("endedAt", event.endedAt)
                        put("outcome", event.outcome.name)
                        put("outcomeConfidence", event.outcomeConfidence)
                        put("phoneNumber", event.phoneNumber)
                        put("simSlot", event.simSlot)
                        put("simCarrier", event.simCarrier)
                        put("phoneAccount", event.phoneAccount)
                        put("dataSource", event.dataSource.name)
                        put("syncStatus", event.syncStatus.name)
                        put("retryCount", event.retryCount)
                        put("lastError", event.lastError)
                        put("createdAt", event.createdAt)
                    }
                    val id = db.insertWithOnConflict("queued_call_events", null, values, SQLiteDatabase.CONFLICT_IGNORE)
                    results.add(id)
                }
                db.setTransactionSuccessful()
            } finally {
                db.endTransaction()
            }
            notifyChanged()
            return results
        }

        override suspend fun getPendingEvents(limit: Int): List<QueuedCallEventEntity> {
            val db = readableDatabase
            val cursor = db.rawQuery(
                "SELECT * FROM queued_call_events WHERE syncStatus IN ('PENDING', 'FAILED') ORDER BY startedAt ASC LIMIT ?",
                arrayOf(limit.toString())
            )
            return cursor.use { parseEvents(it) }
        }

        override fun observeRecentEvents(limit: Int): Flow<List<QueuedCallEventEntity>> {
            return changeSignal.map {
                val db = readableDatabase
                val cursor = db.rawQuery(
                    "SELECT * FROM queued_call_events ORDER BY startedAt DESC LIMIT ?",
                    arrayOf(limit.toString())
                )
                cursor.use { parseEvents(it) }
            }
        }

        override fun observePendingCount(): Flow<Int> {
            return changeSignal.map {
                getPendingCount()
            }
        }

        override suspend fun getPendingCount(): Int {
            val db = readableDatabase
            val cursor = db.rawQuery(
                "SELECT COUNT(*) FROM queued_call_events WHERE syncStatus IN ('PENDING', 'FAILED')",
                null
            )
            return cursor.use {
                if (it.moveToFirst()) it.getInt(0) else 0
            }
        }

        override suspend fun getLatestEventTimestamp(): Long? {
            val db = readableDatabase
            val cursor = db.rawQuery(
                "SELECT MAX(startedAt) FROM queued_call_events",
                null
            )
            return cursor.use {
                if (it.moveToFirst() && !it.isNull(0)) it.getLong(0) else null
            }
        }

        override suspend fun updateSyncStatus(ids: List<Long>, status: SyncStatus) {
            if (ids.isEmpty()) return
            val db = writableDatabase
            val placeholders = ids.joinToString(",") { "?" }
            val args = arrayOf(status.name) + ids.map { it.toString() }.toTypedArray()
            db.execSQL("UPDATE queued_call_events SET syncStatus = ? WHERE id IN ($placeholders)", args)
            notifyChanged()
        }

        override suspend fun resetAllToPending() {
            val db = writableDatabase
            db.execSQL("UPDATE queued_call_events SET syncStatus = 'PENDING'")
            notifyChanged()
        }

        override suspend fun markFailedWithRetry(ids: List<Long>, error: String) {
            if (ids.isEmpty()) return
            val db = writableDatabase
            val placeholders = ids.joinToString(",") { "?" }
            val args = arrayOf(error) + ids.map { it.toString() }.toTypedArray()
            db.execSQL("UPDATE queued_call_events SET syncStatus = 'FAILED', retryCount = retryCount + 1, lastError = ? WHERE id IN ($placeholders)", args)
            notifyChanged()
        }

        override suspend fun pruneOldSyncedEvents(olderThanTimestamp: Long) {
            val db = writableDatabase
            db.delete("queued_call_events", "syncStatus = 'SYNCED' AND createdAt < ?", arrayOf(olderThanTimestamp.toString()))
            notifyChanged()
        }
    }

    private fun notifyChanged() {
        changeSignal.value = System.currentTimeMillis()
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS queued_call_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sourceCallId TEXT UNIQUE,
                direction TEXT NOT NULL,
                durationSeconds INTEGER NOT NULL,
                startedAt INTEGER NOT NULL,
                endedAt INTEGER,
                outcome TEXT NOT NULL,
                outcomeConfidence REAL NOT NULL DEFAULT 1.0,
                phoneNumber TEXT NOT NULL,
                simSlot INTEGER,
                simCarrier TEXT,
                phoneAccount TEXT,
                dataSource TEXT NOT NULL,
                syncStatus TEXT NOT NULL,
                retryCount INTEGER NOT NULL DEFAULT 0,
                lastError TEXT,
                createdAt INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_sync_time ON queued_call_events(syncStatus, startedAt)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS queued_call_events")
        onCreate(db)
    }

    open fun queuedCallEventDao(): QueuedCallEventDao = dao

    companion object {
        private const val DATABASE_NAME = "teletrack_agent.db"
        private const val DATABASE_VERSION = 1

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AppDatabase(context.applicationContext).also { INSTANCE = it }
            }
        }

        private fun parseEvents(c: Cursor): List<QueuedCallEventEntity> {
            val list = mutableListOf<QueuedCallEventEntity>()
            val idIdx = c.getColumnIndex("id")
            val sourceIdIdx = c.getColumnIndex("sourceCallId")
            val dirIdx = c.getColumnIndex("direction")
            val durIdx = c.getColumnIndex("durationSeconds")
            val startIdx = c.getColumnIndex("startedAt")
            val endIdx = c.getColumnIndex("endedAt")
            val outIdx = c.getColumnIndex("outcome")
            val confIdx = c.getColumnIndex("outcomeConfidence")
            val phoneIdx = c.getColumnIndex("phoneNumber")
            val simSlotIdx = c.getColumnIndex("simSlot")
            val simCarrierIdx = c.getColumnIndex("simCarrier")
            val accountIdx = c.getColumnIndex("phoneAccount")
            val sourceIdx = c.getColumnIndex("dataSource")
            val statusIdx = c.getColumnIndex("syncStatus")
            val retryIdx = c.getColumnIndex("retryCount")
            val errIdx = c.getColumnIndex("lastError")
            val createdIdx = c.getColumnIndex("createdAt")

            while (c.moveToNext()) {
                val dirStr = if (dirIdx >= 0) c.getString(dirIdx) else "UNKNOWN"
                val outStr = if (outIdx >= 0) c.getString(outIdx) else "UNKNOWN"
                val sourceStr = if (sourceIdx >= 0) c.getString(sourceIdx) else "NATIVE_CALL_LOG"
                val statusStr = if (statusIdx >= 0) c.getString(statusIdx) else "PENDING"

                list.add(
                    QueuedCallEventEntity(
                        id = if (idIdx >= 0) c.getLong(idIdx) else 0L,
                        sourceCallId = if (sourceIdIdx >= 0) c.getString(sourceIdIdx) else "",
                        direction = try { CallDirection.valueOf(dirStr) } catch (_: Exception) { CallDirection.UNKNOWN },
                        durationSeconds = if (durIdx >= 0) c.getLong(durIdx) else 0L,
                        startedAt = if (startIdx >= 0) c.getLong(startIdx) else 0L,
                        endedAt = if (endIdx >= 0 && !c.isNull(endIdx)) c.getLong(endIdx) else null,
                        outcome = try { CallOutcome.valueOf(outStr) } catch (_: Exception) { CallOutcome.UNKNOWN },
                        outcomeConfidence = if (confIdx >= 0) c.getFloat(confIdx) else 1.0f,
                        phoneNumber = if (phoneIdx >= 0) c.getString(phoneIdx) else "",
                        simSlot = if (simSlotIdx >= 0 && !c.isNull(simSlotIdx)) c.getInt(simSlotIdx) else null,
                        simCarrier = if (simCarrierIdx >= 0) c.getString(simCarrierIdx) else null,
                        phoneAccount = if (accountIdx >= 0) c.getString(accountIdx) else null,
                        dataSource = try { DataSource.valueOf(sourceStr) } catch (_: Exception) { DataSource.NATIVE_CALL_LOG },
                        syncStatus = try { SyncStatus.valueOf(statusStr) } catch (_: Exception) { SyncStatus.PENDING },
                        retryCount = if (retryIdx >= 0) c.getInt(retryIdx) else 0,
                        lastError = if (errIdx >= 0) c.getString(errIdx) else null,
                        createdAt = if (createdIdx >= 0) c.getLong(createdIdx) else System.currentTimeMillis()
                    )
                )
            }
            return list
        }
    }
}
