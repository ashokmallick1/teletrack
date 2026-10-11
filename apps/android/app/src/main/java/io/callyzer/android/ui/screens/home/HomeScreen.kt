package io.callyzer.android.ui.screens.home

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import io.callyzer.android.data.remote.AssignedLeadDto
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

    var assignedLeads by remember { mutableStateOf<List<AssignedLeadDto>>(emptyList()) }
    var isLoadingLeads by remember { mutableStateOf(false) }

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
    var syncFeedbackMessage by remember { mutableStateOf<String?>(null) }

    fun refreshLeads() {
        isLoadingLeads = true
        coroutineScope.launch {
            try {
                assignedLeads = repository.fetchAssignedLeads()
            } catch (_: Exception) {
            } finally {
                isLoadingLeads = false
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshLeads()
    }

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
                    .padding(horizontal = 20.dp, vertical = 20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = tokenStorage.employeeName ?: "Telecaller",
                            color = Color.White,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = tokenStorage.organizationName ?: "Company",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 13.sp
                        )
                    }

                    Surface(
                        color = Color.White.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Text(
                            text = "ONLINE",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Server Connection Pill
                Surface(
                    color = Color.Black.copy(alpha = 0.25f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color(0xFF10B981), CircleShape)
                        )
                        Text(
                            text = "Web App: ${tokenStorage.baseUrl.replace("https://", "").replace("http://", "")}",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            maxLines = 1
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
            // Permission Banner
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (hasCallLogPermission) Color(0xFFECFDF5) else Color(0xFFFEF3C7)
                    ),
                    elevation = CardDefaults.cardElevation(1.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
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
                                text = if (hasCallLogPermission) "Automated SIM Telemetry Active" else "Call Log Permission Required",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = if (hasCallLogPermission) Color(0xFF065F46) else Color(0xFF92400E)
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = if (hasCallLogPermission)
                                "Normal SIM calls made through native dialer are queued and uploaded to the Web App."
                            else
                                "Grant READ_CALL_LOG to automatically sync normal SIM calls.",
                            fontSize = 12.sp,
                            color = if (hasCallLogPermission) Color(0xFF047857) else Color(0xFFB45309)
                        )

                        if (!hasCallLogPermission) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = {
                                    permissionLauncher.launch(Manifest.permission.READ_CALL_LOG)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Grant Permission", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // Sync Status & Queue Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "SYNCHRONIZATION STATUS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Gray,
                            letterSpacing = 0.5.sp
                        )

                        Spacer(modifier = Modifier.height(10.dp))

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
                                    syncFeedbackMessage = null
                                    coroutineScope.launch {
                                        val result = repository.syncNowDirect()
                                        syncFeedbackMessage = result
                                        isSyncing = false
                                        refreshLeads()
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                enabled = !isSyncing
                            ) {
                                if (isSyncing) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Uploading...", fontSize = 13.sp)
                                } else {
                                    Text("Sync with Web App", fontSize = 13.sp)
                                }
                            }
                        }

                        if (syncFeedbackMessage != null) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Surface(
                                color = Color(0xFFF0FDF4),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = syncFeedbackMessage!!,
                                    color = Color(0xFF15803D),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(8.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        Divider(color = Color(0xFFF1F5F9))
                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "Last: ${tokenStorage.lastSyncStatus}",
                            fontSize = 11.sp,
                            color = Color.DarkGray,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }

            // Quick Nav Links
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
                        Text("Manual Log", fontSize = 12.sp)
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

            // Assigned Leads Section (From Web SaaS)
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Assigned Leads to Call",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    TextButton(onClick = { refreshLeads() }) {
                        Text(if (isLoadingLeads) "Loading..." else "Refresh", fontSize = 12.sp)
                    }
                }
            }

            if (assignedLeads.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Text(
                            text = "No leads assigned currently. Leads assigned to you in the Web App will appear here for 1-click calling.",
                            fontSize = 12.sp,
                            color = Color.Gray,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            } else {
                items(assignedLeads) { lead ->
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
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = lead.name,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = lead.company ?: "No company",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                                Text(
                                    text = lead.phoneNumber,
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }

                            // 1-Click Call Button: Opens Native Phone Dialer
                            Button(
                                onClick = {
                                    val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                                        data = Uri.parse("tel:${lead.phoneNumber}")
                                    }
                                    context.startActivity(dialIntent)
                                },
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                            ) {
                                Text("Call", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // Recent Calls Activity Stream
            item {
                Text(
                    text = "Handset Call History",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }

            if (recentEvents.isEmpty()) {
                item {
                    Text(
                        text = "No calls recorded locally yet. Make a SIM call using your normal phone dialer.",
                        fontSize = 12.sp,
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
private fun CallEventRow(event: QueuedCallEventEntity) {
    val timeFormat = remember { SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val directionColor = when (event.direction) {
                        CallDirection.INCOMING -> Color(0xFF2563EB)
                        CallDirection.OUTGOING -> Color(0xFF16A34A)
                        CallDirection.MISSED -> Color(0xFFDC2626)
                        CallDirection.REJECTED -> Color(0xFF9333EA)
                        else -> Color.Gray
                    }
                    Text(
                        text = event.direction.name,
                        color = directionColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "•",
                        color = Color.LightGray,
                        fontSize = 11.sp
                    )
                    Text(
                        text = "${event.durationSeconds}s",
                        color = Color.DarkGray,
                        fontSize = 11.sp
                    )
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = event.phoneNumber,
                    fontSize = 13.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold
                )

                Text(
                    text = timeFormat.format(Date(event.startedAt)),
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }

            // Sync Status Badge
            Surface(
                color = when (event.syncStatus.name) {
                    "SYNCED" -> Color(0xFFECFDF5)
                    "SYNCING" -> Color(0xFFEFF6FF)
                    "FAILED" -> Color(0xFFFEE2E2)
                    else -> Color(0xFFFEF3C7)
                },
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = event.syncStatus.name,
                    color = when (event.syncStatus.name) {
                        "SYNCED" -> Color(0xFF065F46)
                        "SYNCING" -> Color(0xFF1E40AF)
                        "FAILED" -> Color(0xFF991B1B)
                        else -> Color(0xFF92400E)
                    },
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}
