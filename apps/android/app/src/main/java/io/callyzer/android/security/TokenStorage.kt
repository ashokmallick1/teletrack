package io.callyzer.android.security

import android.content.Context
import android.content.SharedPreferences

class TokenStorage(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("callyzer_secure_prefs", Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString(KEY_BASE_URL, "https://callyzer.bhashaai.in") ?: "https://callyzer.bhashaai.in"
        set(value) = prefs.edit().putString(KEY_BASE_URL, value.trim()).apply()

    var deviceApiKey: String?
        get() = prefs.getString(KEY_DEVICE_API_KEY, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_API_KEY, value).apply()

    var deviceId: String?
        get() = prefs.getString(KEY_DEVICE_ID, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    var organizationId: String?
        get() = prefs.getString(KEY_ORG_ID, null)
        set(value) = prefs.edit().putString(KEY_ORG_ID, value).apply()

    var organizationName: String?
        get() = prefs.getString(KEY_ORG_NAME, null)
        set(value) = prefs.edit().putString(KEY_ORG_NAME, value).apply()

    var employeeId: String?
        get() = prefs.getString(KEY_EMPLOYEE_ID, null)
        set(value) = prefs.edit().putString(KEY_EMPLOYEE_ID, value).apply()

    var employeeName: String?
        get() = prefs.getString(KEY_EMPLOYEE_NAME, null)
        set(value) = prefs.edit().putString(KEY_EMPLOYEE_NAME, value).apply()

    var isEnrolled: Boolean
        get() = !deviceApiKey.isNullOrBlank() && !deviceId.isNullOrBlank()
        set(_) {}

    var lastSyncTimestamp: Long
        get() = prefs.getLong(KEY_LAST_SYNC, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_SYNC, value).apply()

    var lastSyncStatus: String
        get() = prefs.getString(KEY_LAST_SYNC_STATUS, "Never Synced") ?: "Never Synced"
        set(value) = prefs.edit().putString(KEY_LAST_SYNC_STATUS, value).apply()

    fun clearAll() {
        val currentUrl = baseUrl
        prefs.edit().clear().apply()
        baseUrl = currentUrl
    }

    companion object {
        private const val KEY_BASE_URL = "key_base_url"
        private const val KEY_DEVICE_API_KEY = "key_device_api_key"
        private const val KEY_DEVICE_ID = "key_device_id"
        private const val KEY_ORG_ID = "key_org_id"
        private const val KEY_ORG_NAME = "key_org_name"
        private const val KEY_EMPLOYEE_ID = "key_employee_id"
        private const val KEY_EMPLOYEE_NAME = "key_employee_name"
        private const val KEY_LAST_SYNC = "key_last_sync"
        private const val KEY_LAST_SYNC_STATUS = "key_last_sync_status"
    }
}
