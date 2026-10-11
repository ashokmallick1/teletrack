package io.callyzer.android.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import io.callyzer.android.security.TokenStorage
import io.callyzer.android.ui.screens.diagnostics.SyncDiagnosticsScreen
import io.callyzer.android.ui.screens.enrollment.EnrollmentScreen
import io.callyzer.android.ui.screens.home.HomeScreen
import io.callyzer.android.ui.screens.manual.ManualCallLogScreen
import io.callyzer.android.ui.screens.settings.SettingsScreen
import io.callyzer.android.ui.theme.CallyzerTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val tokenStorage = TokenStorage(this)

        setContent {
            CallyzerTheme {
                var currentScreen by remember {
                    mutableStateOf(if (tokenStorage.isEnrolled) "home" else "enrollment")
                }

                when (currentScreen) {
                    "enrollment" -> {
                        EnrollmentScreen(
                            onEnrollmentSuccess = {
                                currentScreen = "home"
                            }
                        )
                    }
                    "home" -> {
                        HomeScreen(
                            onNavigateToManualLog = { currentScreen = "manual" },
                            onNavigateToDiagnostics = { currentScreen = "diagnostics" },
                            onNavigateToSettings = { currentScreen = "settings" }
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
}
