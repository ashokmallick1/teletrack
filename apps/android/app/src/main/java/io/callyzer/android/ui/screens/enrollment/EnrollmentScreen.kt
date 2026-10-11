package io.callyzer.android.ui.screens.enrollment

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import io.callyzer.android.data.remote.ApiClient
import io.callyzer.android.data.remote.DeviceEnrollmentRequest
import io.callyzer.android.security.TokenStorage
import kotlinx.coroutines.launch
import java.util.UUID

@Composable
fun EnrollmentScreen(
    onEnrollmentSuccess: () -> Unit
) {
    val context = LocalContext.current
    val tokenStorage = remember { TokenStorage(context) }
    val coroutineScope = rememberCoroutineScope()

    var baseUrl by remember { mutableStateOf(tokenStorage.baseUrl) }
    var enrollmentToken by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // App Badge
        Box(
            modifier = Modifier
                .size(64.dp)
                .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "C",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Callyzer Agent",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Text(
            text = "SIM Call Analytics Handset Enrollment",
            fontSize = 14.sp,
            color = Color.Gray,
            modifier = Modifier.padding(top = 4.dp)
        )

        Spacer(modifier = Modifier.height(32.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (errorMessage != null) {
                    Surface(
                        color = Color(0xFFFEE2E2),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = errorMessage!!,
                            color = Color(0xFFDC2626),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                OutlinedTextField(
                    value = baseUrl,
                    onValueChange = { baseUrl = it },
                    label = { Text("Server URL") },
                    placeholder = { Text("http://10.0.2.2:4000") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = enrollmentToken,
                    onValueChange = { enrollmentToken = it },
                    label = { Text("Enrollment Token") },
                    placeholder = { Text("ENROLL-XXXXXX") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Button(
                    onClick = {
                        if (enrollmentToken.isBlank()) {
                            errorMessage = "Please enter enrollment token"
                            return@Button
                        }
                        isLoading = true
                        errorMessage = null

                        coroutineScope.launch {
                            try {
                                val api = ApiClient.getService(baseUrl)
                                val deviceId = "hw_${UUID.randomUUID().toString().take(12)}"
                                val request = DeviceEnrollmentRequest(
                                    enrollmentToken = enrollmentToken.trim(),
                                    deviceIdentifier = deviceId,
                                    deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                                    model = Build.MODEL,
                                    manufacturer = Build.MANUFACTURER,
                                    osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                                    appVersion = "1.0.0",
                                    permissionGranted = true,
                                    simMetadata = mapOf(
                                        "board" to Build.BOARD,
                                        "device" to Build.DEVICE
                                    )
                                )

                                val response = api.enrollDevice(request)
                                if (response.isSuccessful && response.body() != null) {
                                    val body = response.body()!!
                                    tokenStorage.baseUrl = baseUrl
                                    tokenStorage.deviceApiKey = body.deviceApiKey
                                    tokenStorage.deviceId = body.deviceId
                                    tokenStorage.organizationId = body.organizationId
                                    tokenStorage.organizationName = body.organizationName
                                    tokenStorage.employeeId = body.employeeId
                                    tokenStorage.employeeName = body.employeeName

                                    onEnrollmentSuccess()
                                } else {
                                    errorMessage = "Enrollment failed: ${response.message()} (${response.code()})"
                                }
                            } catch (e: Exception) {
                                errorMessage = e.localizedMessage ?: "Failed to connect to server"
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Register Handset", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Hardware: ${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE})",
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
            color = Color.Gray
        )
    }
}
