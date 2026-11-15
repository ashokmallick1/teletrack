package io.teletrack.android.tracking

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import io.teletrack.android.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * TrackHR-style Persistent Foreground Service for Mobile Geolocation & Attendance.
 * Operates strictly between user-initiated Check-In and Check-Out.
 */
class LocationTrackingService : Service(), LocationListener {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var locationManager: LocationManager? = null
    private var lastRecordedLocation: Location? = null

    companion object {
        const val TAG = "TeleTrackLocation"
        const val CHANNEL_ID = "teletrack_field_tracking_channel"
        const val NOTIFICATION_ID = 2026

        const val ACTION_START_TRACKING = "io.teletrack.android.START_LOCATION_TRACKING"
        const val ACTION_STOP_TRACKING = "io.teletrack.android.STOP_LOCATION_TRACKING"
        const val EXTRA_BASE_URL = "extra_base_url"
        const val EXTRA_TOKEN = "extra_token"
        const val EXTRA_ORG_ID = "extra_org_id"
        const val EXTRA_EMPLOYEE_ID = "extra_employee_id"
    }

    private var baseUrl: String = "https://teletrack-api.bhashaai.in"
    private var authToken: String? = null
    private var orgId: String? = null
    private var employeeId: String? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_STICKY

        when (intent.action) {
            ACTION_START_TRACKING -> {
                baseUrl = intent.getStringExtra(EXTRA_BASE_URL) ?: baseUrl
                authToken = intent.getStringExtra(EXTRA_TOKEN)
                orgId = intent.getStringExtra(EXTRA_ORG_ID)
                employeeId = intent.getStringExtra(EXTRA_EMPLOYEE_ID)

                startForeground(NOTIFICATION_ID, buildForegroundNotification("On Duty & Location Active"))
                startLocationUpdates()
                Log.i(TAG, "TeleTrack Location Tracking Service Started for Org: $orgId")
            }
            ACTION_STOP_TRACKING -> {
                stopLocationUpdates()
                stopForeground(true)
                stopSelf()
                Log.i(TAG, "TeleTrack Location Tracking Service Stopped")
            }
        }

        return START_STICKY
    }

    private fun startLocationUpdates() {
        try {
            locationManager?.let { lm ->
                if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    lm.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        30000L, // 30 seconds interval
                        15f,     // 15 meters min displacement
                        this
                    )
                }
                if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    lm.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        30000L,
                        15f,
                        this
                    )
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing: ${e.message}")
        }
    }

    private fun stopLocationUpdates() {
        try {
            locationManager?.removeUpdates(this)
        } catch (e: SecurityException) {
            Log.e(TAG, "Error removing location updates: ${e.message}")
        }
    }

    override fun onLocationChanged(location: Location) {
        lastRecordedLocation = location

        // 1. Detect Mock Location (Fake GPS prevention)
        val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }

        // 2. Battery status
        val (batteryLevel, isCharging) = getBatteryInfo()

        // 3. Dispatch breadcrumb ping to API
        serviceScope.launch {
            sendPingToServer(
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracy,
                speed = if (location.hasSpeed()) location.speed * 3.6f else 0f, // convert m/s to km/h
                heading = if (location.hasBearing()) location.bearing else 0f,
                altitude = if (location.hasAltitude()) location.altitude else 0.0,
                batteryLevel = batteryLevel,
                isCharging = isCharging,
                isMockLocation = isMock
            )
        }
    }

    private fun getBatteryInfo(): Pair<Int, Boolean> {
        return try {
            val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
            val percentage = if (level >= 0 && scale > 0) ((level.toFloat() / scale.toFloat()) * 100).toInt() else 85
            Pair(percentage, isCharging)
        } catch (e: Exception) {
            Pair(85, false)
        }
    }

    private fun sendPingToServer(
        latitude: Double,
        longitude: Double,
        accuracy: Float,
        speed: Float,
        heading: Float,
        altitude: Double,
        batteryLevel: Int,
        isCharging: Boolean,
        isMockLocation: Boolean
    ) {
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/tracking/location/ping")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            authToken?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
            orgId?.let { conn.setRequestProperty("x-organization-id", it) }
            conn.doOutput = true
            conn.connectTimeout = 10000
            conn.readTimeout = 10000

            val isoDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            val payload = JSONObject().apply {
                put("employeeId", employeeId)
                put("latitude", latitude)
                put("longitude", longitude)
                put("accuracy", accuracy.toDouble())
                put("speed", speed.toDouble())
                put("heading", heading.toDouble())
                put("altitude", altitude)
                put("batteryLevel", batteryLevel)
                put("isCharging", isCharging)
                put("isMockLocation", isMockLocation)
                put("timestamp", isoDate)
            }

            conn.outputStream.use { os ->
                os.write(payload.toString().toByteArray())
            }

            val code = conn.responseCode
            if (code in 200..299) {
                Log.d(TAG, "Location ping synced successfully ($latitude, $longitude)")
            } else {
                Log.w(TAG, "Location ping rejected by server: HTTP $code")
            }
            conn.disconnect()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send location ping to server: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "TeleTrack Field Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows live status while shift tracking is active"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("TeleTrack Field Tracking")
                .setContentText(statusText)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("TeleTrack Field Tracking")
                .setContentText(statusText)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }
    }

    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}
    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        stopLocationUpdates()
        Log.i(TAG, "TeleTrack Location Tracking Service Destroyed")
    }
}
