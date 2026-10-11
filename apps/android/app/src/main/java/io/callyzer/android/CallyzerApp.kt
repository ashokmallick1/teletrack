package io.callyzer.android

import android.app.Application
import android.util.Log
import io.callyzer.android.repository.CallRepository
import io.callyzer.android.security.TokenStorage

class CallyzerApp : Application() {

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
            Log.e("CallyzerApp", "Startup error", e)
        }
    }
}
