package io.callyzer.android

import android.app.Application
import io.callyzer.android.repository.CallRepository
import io.callyzer.android.security.TokenStorage

class CallyzerApp : Application() {

    lateinit var tokenStorage: TokenStorage
    lateinit var callRepository: CallRepository

    override fun onCreate() {
        super.onCreate()
        tokenStorage = TokenStorage(this)
        callRepository = CallRepository(this)

        if (tokenStorage.isEnrolled) {
            callRepository.schedulePeriodicSync(intervalMinutes = 15)
        }
    }
}
