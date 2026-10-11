package io.callyzer.android.data.source

import android.content.Context
import io.callyzer.android.data.model.CallRecord
import io.callyzer.android.data.model.DataSource

data class DataSourceCapabilities(
    val supportsAutomatedPolling: Boolean,
    val supportsSimMetadata: Boolean,
    val requiresRuntimePermission: Boolean,
    val permissionName: String?,
    val isLegallyAuthorizedInCurrentBuild: Boolean
)

interface CallDataSource {
    val sourceType: DataSource

    fun getCapabilities(): DataSourceCapabilities

    fun isAvailable(context: Context): Boolean

    suspend fun fetchCallEvents(
        context: Context,
        sinceTimestamp: Long,
        limit: Int = 100
    ): List<CallRecord>
}
