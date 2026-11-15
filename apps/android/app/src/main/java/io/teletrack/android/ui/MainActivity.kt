package io.teletrack.android.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import io.teletrack.android.repository.CallRepository
import io.teletrack.android.security.TokenStorage
import io.teletrack.android.ui.screens.diagnostics.SyncDiagnosticsScreen
import io.teletrack.android.ui.screens.enrollment.EnrollmentScreen
import io.teletrack.android.ui.screens.home.HomeScreen
import io.teletrack.android.ui.screens.manual.ManualCallLogScreen
import io.teletrack.android.ui.screens.settings.SettingsScreen
import io.teletrack.android.ui.theme.TeleTrackTheme

import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var tokenStorage: TokenStorage
    private lateinit var repository: CallRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        tokenStorage = TokenStorage(this)
        repository = CallRepository(this)

        if (tokenStorage.isEnrolled) {
            repository.schedulePeriodicSync(15)
        }

        setContent {
            TeleTrackTheme {
                var currentScreen by remember {
                    mutableStateOf(if (tokenStorage.isEnrolled) "home" else "enrollment")
                }

                when (currentScreen) {
                    "enrollment" -> {
                        EnrollmentScreen(
                            onEnrollmentSuccess = {
                                repository.schedulePeriodicSync(15)
                                repository.triggerBackgroundSync()
                                lifecycleScope.launch(Dispatchers.IO) {
                                    repository.syncNowDirect()
                                }
                                currentScreen = "home"
                            }
                        )
                    }
                    "home" -> {
                        HomeScreen(
                            onNavigateToManualLog = { currentScreen = "manual" },
                            onNavigateToDiagnostics = { currentScreen = "diagnostics" },
                            onNavigateToSettings = { currentScreen = "settings" },
                            onReEnroll = { currentScreen = "enrollment" }
                        )
                    }
                    "manual" -> {
                        ManualCallLogScreen(
                            onNavigateBack = { currentScreen = "home" }
                        )
                    }
                    "diagnostics" -> {
                        SyncDiagnosticsScreen(
                            onNavigateBack = { currentScreen = "home" }
                        )
                    }
                    "settings" -> {
                        SettingsScreen(
                            onNavigateBack = { currentScreen = "home" },
                            onLogout = { currentScreen = "enrollment" }
                        )
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::tokenStorage.isInitialized && tokenStorage.isEnrolled && ::repository.isInitialized) {
            lifecycleScope.launch(Dispatchers.IO) {
                repository.syncNowDirect()
            }
        }
    }
}
