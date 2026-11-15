package io.teletrack.android.ui.screens.diagnostics

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.teletrack.android.security.TokenStorage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncDiagnosticsScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val tokenStorage = remember { TokenStorage(context) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Agent Diagnostics", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    TextButton(onClick = onNavigateBack) { Text("Back") }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("DEVICE TELEMETRY PROFILE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Text("Model: ${Build.MANUFACTURER} ${Build.MODEL}", fontSize = 13.sp)
                    Text("OS: Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})", fontSize = 13.sp)
                    Text("Device ID: ${tokenStorage.deviceId ?: "None"}", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                    Text("Server Endpoint: ${tokenStorage.baseUrl}", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                    Text("Sync Status: ${tokenStorage.lastSyncStatus}", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("ENROLLMENT IDENTITY", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Text("Org: ${tokenStorage.organizationName ?: "None"}", fontSize = 13.sp)
                    Text("Employee: ${tokenStorage.employeeName ?: "None"}", fontSize = 13.sp)
                    Text("Org ID: ${tokenStorage.organizationId ?: "None"}", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }
    }
}
