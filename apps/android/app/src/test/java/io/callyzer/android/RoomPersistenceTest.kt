package io.callyzer.android

import io.callyzer.android.data.local.QueuedCallEventEntity
import io.callyzer.android.data.model.CallDirection
import io.callyzer.android.data.model.CallOutcome
import io.callyzer.android.data.model.DataSource
import io.callyzer.android.data.model.SyncStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RoomPersistenceTest {

    @Test
    fun testEntityDefaultsAndMapping() {
        val now = System.currentTimeMillis()
        val entity = QueuedCallEventEntity(
            id = 1,
            sourceCallId = "call_test_101",
            direction = CallDirection.OUTGOING,
            durationSeconds = 185,
            startedAt = now,
            endedAt = now + 185000,
            outcome = CallOutcome.ANSWERED,
            phoneNumber = "+919822011223",
            simCarrier = "Jio 5G",
            dataSource = DataSource.NATIVE_CALL_LOG,
            syncStatus = SyncStatus.PENDING
        )

        assertEquals("call_test_101", entity.sourceCallId)
        assertEquals(SyncStatus.PENDING, entity.syncStatus)
        assertEquals(185L, entity.durationSeconds)
        assertTrue(entity.outcomeConfidence >= 1.0f)
    }
}
