package io.teletrack.android

import io.teletrack.android.data.model.CallDirection
import io.teletrack.android.data.model.CallOutcome
import io.teletrack.android.data.model.CallRecord
import io.teletrack.android.data.model.DataSource
import io.teletrack.android.data.source.AuthorizedCallLogDataSource
import io.teletrack.android.data.source.ManualCallDataSource
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CallDataSourceTest {

    @Test
    fun testAuthorizedDataSourceCapabilities() {
        val dataSource = AuthorizedCallLogDataSource()
        val capabilities = dataSource.getCapabilities()

        assertTrue(capabilities.supportsAutomatedPolling)
        assertTrue(capabilities.supportsSimMetadata)
        assertTrue(capabilities.requiresRuntimePermission)
        assertEquals("android.permission.READ_CALL_LOG", capabilities.permissionName)
        assertEquals(DataSource.NATIVE_CALL_LOG, dataSource.sourceType)
    }

    @Test
    fun testManualDataSourceFallback() {
        val manualSource = ManualCallDataSource()
        val capabilities = manualSource.getCapabilities()

        assertFalse(capabilities.supportsAutomatedPolling)
        assertFalse(capabilities.requiresRuntimePermission)
        assertEquals(DataSource.MANUAL_ENTRY, manualSource.sourceType)

        val record = manualSource.createManualRecord(
            CallRecord(
                sourceCallId = "temp",
                direction = CallDirection.OUTGOING,
                durationSeconds = 120,
                startedAt = System.currentTimeMillis(),
                endedAt = null,
                outcome = CallOutcome.ANSWERED,
                phoneNumber = "+919811122233"
            )
        )

        assertNotNull(record.sourceCallId)
        assertTrue(record.sourceCallId.startsWith("manual_"))
        assertEquals(DataSource.MANUAL_ENTRY, record.dataSource)
    }
}
