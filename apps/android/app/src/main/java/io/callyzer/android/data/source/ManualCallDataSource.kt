package io.callyzer.android.data.source

import android.content.Context
import io.callyzer.android.data.model.CallRecord
import io.callyzer.android.data.model.DataSource
import java.util.UUID

/**
 * Fallback data source for environments where READ_CALL_LOG cannot be granted
 * (e.g. personal BYOD devices under standard Play Store policies without MDM).
 * Enables telecallers to manually record call outcomes.
 */
class ManualCallDataSource : CallDataSource {

    override val sourceType: DataSource = DataSource.MANUAL_ENTRY

    override fun getCapabilities(): DataSourceCapabilities {
        return DataSourceCapabilities(
            supportsAutomatedPolling = false,
            supportsSimMetadata = false,
            requiresRuntimePermission = false,
            permissionName = null,
            isLegallyAuthorizedInCurrentBuild = true
        )
    }

    override fun isAvailable(context: Context): Boolean = true

    override suspend fun fetchCallEvents(
        context: Context,
        sinceTimestamp: Long,
        limit: Int
    ): List<CallRecord> {
        // Manual events are pushed individually to repository rather than polled from system
        return emptyList()
    }

    fun createManualRecord(record: CallRecord): CallRecord {
        return record.copy(
            sourceCallId = "manual_${UUID.randomUUID()}",
            dataSource = DataSource.MANUAL_ENTRY
        )
    }
}
