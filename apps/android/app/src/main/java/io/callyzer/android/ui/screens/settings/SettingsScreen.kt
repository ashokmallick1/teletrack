package io.callyzer.android.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.callyzer.android.security.TokenStorage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val tokenStorage = remember { TokenStorage(context) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings & Privacy", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
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
                    Text("DATA PRIVACY & COMPLIANCE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Text("• This agent only collects call log metadata (duration, timestamp, outcome, phone number).", fontSize = 13.sp, color = Color.DarkGray)
                    Text("• No audio recording or microphone capture is ever performed.", fontSize = 13.sp, color = Color.DarkGray)
                    Text("• SMS, personal contacts and browser data are not collected.", fontSize = 13.sp, color = Color.DarkGray)
                    Text("• Telemetry is transmitted over encrypted HTTPS to your company's tenant.", fontSize = 13.sp, color = Color.DarkGray)
                }
            }

            Spacer(modifier = Modifier.weight(1f))

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
