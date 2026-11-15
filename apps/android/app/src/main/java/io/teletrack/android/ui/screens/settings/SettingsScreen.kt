package io.teletrack.android.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val tokenStorage = remember { TokenStorage(context) }
    val scrollState = rememberScrollState()

    var serverUrl by remember { mutableStateOf(tokenStorage.baseUrl) }
    var saveFeedback by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings & Connection", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
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
                .verticalScroll(scrollState)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Enrolled Identity Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("ENROLLED TELECALLER IDENTITY", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)

                    Text("Employee: ${tokenStorage.employeeName ?: "Unknown"}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text("Organization: ${tokenStorage.organizationName ?: "Unknown"}", fontSize = 13.sp, color = Color.DarkGray)
                    Text("Device ID: ${tokenStorage.deviceId ?: "None"}", fontSize = 12.sp, fontFamily = FontFamily.Monospace, color = Color.Gray)
                }
            }

            // Web Server Connection Configuration
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("TARGET WEB SAAS ENDPOINT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)

                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = {
                            serverUrl = it
                            saveFeedback = false
                        },
                        label = { Text("Server URL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                tokenStorage.baseUrl = serverUrl.trim()
                                saveFeedback = true
                            },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(if (saveFeedback) "Saved!" else "Update Server URL", fontSize = 12.sp)
                        }

                        OutlinedButton(
                            onClick = {
                                serverUrl = "https://teletrack.bhashaai.in"
                                tokenStorage.baseUrl = serverUrl
                                saveFeedback = true
                            },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Reset to Cloud", fontSize = 12.sp)
                        }
                    }
                }
            }

            // Compliance & Privacy Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("DATA PRIVACY & COMPLIANCE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Text("• This agent only collects call log metadata (duration, timestamp, outcome, phone number).", fontSize = 12.sp, color = Color.DarkGray)
                    Text("• No audio recording or microphone capture is ever performed.", fontSize = 12.sp, color = Color.DarkGray)
                    Text("• SMS, personal contacts and browser data are never accessed.", fontSize = 12.sp, color = Color.DarkGray)
                    Text("• Telemetry is transmitted over encrypted HTTPS directly to your company's tenant.", fontSize = 12.sp, color = Color.DarkGray)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Button(
                onClick = {
                    tokenStorage.clearAll()
                    onLogout()
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text("Unlink Handset & Log Out", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
