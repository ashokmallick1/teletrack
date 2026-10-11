package io.callyzer.android.ui.screens.home

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import io.callyzer.android.data.local.QueuedCallEventEntity
import io.callyzer.android.data.model.CallDirection
import io.callyzer.android.repository.CallRepository
import io.callyzer.android.security.TokenStorage
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HomeScreen(
    onNavigateToManualLog: () -> Unit,
    onNavigateToDiagnostics: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val context = LocalContext.current
    val tokenStorage = remember { TokenStorage(context) }
    val repository = remember { CallRepository(context) }
    val coroutineScope = rememberCoroutineScope()

    val pendingCount by repository.observePendingCount().collectAsState(initial = 0)
    val recentEvents by repository.observeRecentEvents(limit = 10).collectAsState(initial = emptyList())

    var hasCallLogPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_CALL_LOG
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCallLogPermission = granted
        if (granted) {
            coroutineScope.launch {
                repository.pollCallLogAndQueue()
            }
        }
    }

    var isSyncing by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Header
        Surface(
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = tokenStorage.employeeName ?: "Employee Telecaller",
                            color = Color.White,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = tokenStorage.organizationName ?: "Company",
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 13.sp
                        )
                    }

                    Surface(
                        color = Color.White.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Text(
                            text = "ENROLLED",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Permission & Telemetry Capability Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (hasCallLogPermission) Color(0xFFECFDF5) else Color(0xFFFEF3C7)
                    ),
                    elevation = CardDefaults.cardElevation(1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(
                                        if (hasCallLogPermission) Color(0xFF10B981) else Color(0xFFF59E0B),
                                        CircleShape
                                    )
                            )
                            Text(
                                text = if (hasCallLogPermission) "Automated Call Telemetry Active" else "Permission Required",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = if (hasCallLogPermission) Color(0xFF065F46) else Color(0xFF92400E)
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = if (hasCallLogPermission)
                                "Native SIM dialer calls are automatically captured and batched in background."
                            else
                                "Grant READ_CALL_LOG permission or use manual call logging fallback.",
                            fontSize = 12.sp,
                            color = if (hasCallLogPermission) Color(0xFF047857) else Color(0xFFB45309)
                        )

                        if (!hasCallLogPermission) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    permissionLauncher.launch(Manifest.permission.READ_CALL_LOG)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Grant Permission", fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            // Sync Status & Queue Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "SYNCHRONIZATION STATUS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Gray,
                            letterSpacing = 1.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "$pendingCount",
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (pendingCount > 0) MaterialTheme.colorScheme.primary else Color(0xFF10B981)
                                )
                                Text(
                                    text = "Pending in local queue",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }

                            Button(
                                onClick = {
                                    isSyncing = true
                                    coroutineScope.launch {
                                        repository.pollCallLogAndQueue()
                                        repository.triggerBackgroundSync()
                                        isSyncing = false
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                enabled = !isSyncing
                            ) {
                                Text(if (isSyncing) "Syncing..." else "Sync Now")
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Divider(color = Color(0xFFF1F5F9))
                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Last Status: ${tokenStorage.lastSyncStatus}",
                            fontSize = 12.sp,
                            color = Color.DarkGray,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }

            // Action Quick Links
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onNavigateToManualLog,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Log Call", fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = onNavigateToDiagnostics,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Diagnostics", fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = onNavigateToSettings,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Settings", fontSize = 12.sp)
                    }
                }
            }

            // Recent Queued Events
            item {
                Text(
                    text = "Recent Activity Stream",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }

            if (recentEvents.isEmpty()) {
                item {
                    Text(
                        text = "No calls recorded locally yet. Make a SIM call from your normal dialer to test.",
                        fontSize = 13.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(vertical = 12.dp)
                    )
                }
            } else {
                items(recentEvents) { event ->
                    CallEventRow(event)
                }
            }
        }
    }
}

@Composable
fun CallEventRow(event: QueuedCallEventEntity) {
    val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = event.phoneNumber,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF0F172A)
                )
                Text(
                    text = "${event.direction} • ${event.durationSeconds}s • ${timeFormat.format(Date(event.startedAt))}",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            Surface(
                color = when (event.syncStatus.name) {
                    "SYNCED" -> Color(0xFFECFDF5)
                    "SYNCING" -> Color(0xFFEFF6FF)
                    "FAILED" -> Color(0xFFFEE2E2)
                    else -> Color(0xFFF1F5F9)
                },
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = event.syncStatus.name,
                    color = when (event.syncStatus.name) {
                        "SYNCED" -> Color(0xFF065F46)
                        "SYNCING" -> Color(0xFF1D4ED8)
                        "FAILED" -> Color(0xFFDC2626)
                        else -> Color(0xFF475569)
                    },
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
        }
    }
}
