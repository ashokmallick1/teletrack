package io.callyzer.android.ui.screens.manual

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.callyzer.android.data.model.CallDirection
import io.callyzer.android.data.model.CallOutcome
import io.callyzer.android.data.model.CallRecord
import io.callyzer.android.data.model.DataSource
import io.callyzer.android.repository.CallRepository
import kotlinx.coroutines.launch
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualCallLogScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val repository = remember { CallRepository(context) }
    val coroutineScope = rememberCoroutineScope()

    var phoneNumber by remember { mutableStateOf("") }
    var direction by remember { mutableStateOf(CallDirection.OUTGOING) }
    var outcome by remember { mutableStateOf(CallOutcome.ANSWERED) }
    var durationSecondsText by remember { mutableStateOf("120") }
    var isSubmitting by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Manual Call Log Entry", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    TextButton(onClick = onNavigateBack) {
                        Text("Back")
                    }
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
            Surface(
                color = Color(0xFFEFF6FF),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "ℹ️ Use this form to manually log a SIM call when automated background permissions are not granted.",
                    color = Color(0xFF1E40AF),
                    fontSize = 12.sp,
                    modifier = Modifier.padding(12.dp)
                )
            }

            OutlinedTextField(
                value = phoneNumber,
                onValueChange = { phoneNumber = it },
                label = { Text("Client Phone Number") },
                placeholder = { Text("+919822011223") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { direction = CallDirection.OUTGOING },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (direction == CallDirection.OUTGOING) MaterialTheme.colorScheme.primary else Color(0xFFE2E8F0)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Outgoing", color = if (direction == CallDirection.OUTGOING) Color.White else Color.Black)
                }

                Button(
                    onClick = { direction = CallDirection.INCOMING },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (direction == CallDirection.INCOMING) MaterialTheme.colorScheme.primary else Color(0xFFE2E8F0)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Incoming", color = if (direction == CallDirection.INCOMING) Color.White else Color.Black)
                }
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { outcome = CallOutcome.ANSWERED },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (outcome == CallOutcome.ANSWERED) Color(0xFF10B981) else Color(0xFFE2E8F0)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Answered", color = if (outcome == CallOutcome.ANSWERED) Color.White else Color.Black)
                }

                Button(
                    onClick = { outcome = CallOutcome.MISSED },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (outcome == CallOutcome.MISSED) Color(0xFFEF4444) else Color(0xFFE2E8F0)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Missed", color = if (outcome == CallOutcome.MISSED) Color.White else Color.Black)
                }
            }

            OutlinedTextField(
                value = durationSecondsText,
                onValueChange = { durationSecondsText = it },
                label = { Text("Call Duration (seconds)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    if (phoneNumber.isBlank()) return@Button
                    isSubmitting = true
                    coroutineScope.launch {
                        val duration = durationSecondsText.toLongOrNull() ?: 0L
                        val record = CallRecord(
                            sourceCallId = "manual_${UUID.randomUUID().toString().take(8)}",
                            direction = direction,
                            durationSeconds = duration,
                            startedAt = System.currentTimeMillis() - (duration * 1000),
                            endedAt = System.currentTimeMillis(),
                            outcome = outcome,
                            phoneNumber = phoneNumber.trim(),
                            dataSource = DataSource.MANUAL_ENTRY
                        )
                        repository.recordManualCall(record)
                        isSubmitting = false
                        onNavigateBack()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(12.dp),
                enabled = !isSubmitting && phoneNumber.isNotBlank()
            ) {
                Text("Save and Queue for Sync", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
