package io.teletrack.android.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import io.teletrack.android.repository.CallRepository
import io.teletrack.android.security.TokenStorage

class CallStateReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            if (stateStr == TelephonyManager.EXTRA_STATE_IDLE) {
                val tokenStorage = TokenStorage(context)
                if (tokenStorage.isEnrolled) {
                    val repository = CallRepository(context)
                    repository.triggerBackgroundSync()
                }
            }
        }
    }
}
