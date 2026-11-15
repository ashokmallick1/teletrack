package io.teletrack.android

import android.app.Application
import android.util.Log
import io.teletrack.android.repository.CallRepository
import io.teletrack.android.security.TokenStorage

class TeleTrackApp : Application() {

    lateinit var tokenStorage: TokenStorage
    lateinit var callRepository: CallRepository

    override fun onCreate() {
        super.onCreate()
        try {
            tokenStorage = TokenStorage(this)
            callRepository = CallRepository(this)

            if (tokenStorage.isEnrolled) {
                callRepository.schedulePeriodicSync(intervalMinutes = 15)
            }
        } catch (e: Throwable) {
            Log.e("TeleTrackApp", "Startup error", e)
        }
    }
}
