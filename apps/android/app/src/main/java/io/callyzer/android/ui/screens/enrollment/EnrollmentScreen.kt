package io.callyzer.android.ui.screens.enrollment

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.callyzer.android.data.remote.ApiClient
import io.callyzer.android.data.remote.DeviceEnrollLoginRequest
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
    val scrollState = rememberScrollState()

    var baseUrl by remember { mutableStateOf(tokenStorage.baseUrl) }
    var selectedTab by remember { mutableStateOf(0) } // 0 = Employee Login, 1 = Token

    // Form states
    var email by remember { mutableStateOf("rahul@acme.com") }
    var password by remember { mutableStateOf("Password123!") }
    var enrollmentToken by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var isPinging by remember { mutableStateOf(false) }
    var serverStatus by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun testConnection() {
        isPinging = true
        serverStatus = null
        coroutineScope.launch {
            try {
                val api = ApiClient.getService(baseUrl)
                val resp = api.checkHealth()
                if (resp.isSuccessful && resp.body() != null) {
                    serverStatus = "Connected: ${resp.body()!!.service} v${resp.body()!!.version}"
                } else {
                    serverStatus = "Server error: HTTP ${resp.code()}"
                }
            } catch (e: Exception) {
                serverStatus = "Failed: ${e.localizedMessage ?: "Cannot reach server"}"
            } finally {
                isPinging = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        // Branding
        Box(
            modifier = Modifier
                .size(60.dp)
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

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Callyzer Mobile Agent",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Text(
            text = "Connect handset to company web analytics",
            fontSize = 13.sp,
            color = Color.Gray
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Server URL Section
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(1.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "TARGET WEB SAAS SERVER",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Gray,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Quick server preset chips
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val isCloud = baseUrl.contains("callyzer.bhashaai.in")
                    FilterChip(
                        selected = isCloud,
                        onClick = {
                            baseUrl = "https://callyzer.bhashaai.in"
                            testConnection()
                        },
                        label = { Text("Cloud Web App", fontSize = 11.sp) },
                        modifier = Modifier.weight(1f)
                    )

                    val isAltApi = baseUrl.contains("callyzer-api.bhashaai.in")
                    FilterChip(
                        selected = isAltApi,
                        onClick = {
                            baseUrl = "https://callyzer-api.bhashaai.in"
                            testConnection()
                        },
                        label = { Text("Direct API", fontSize = 11.sp) },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = baseUrl,
                    onValueChange = {
                        baseUrl = it
                        serverStatus = null
                    },
                    label = { Text("Web App Server URL", fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace)
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = { testConnection() },
                        enabled = !isPinging
                    ) {
                        Text(if (isPinging) "Testing..." else "Test Connection")
                    }

                    if (serverStatus != null) {
                        val isSuccess = serverStatus!!.startsWith("Connected")
                        Surface(
                            color = if (isSuccess) Color(0xFFECFDF5) else Color(0xFFFEE2E2),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = serverStatus!!,
                                color = if (isSuccess) Color(0xFF065F46) else Color(0xFFDC2626),
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Enrollment Tabs
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Employee Login", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Admin Token", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Enrollment Card Body
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
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

                if (selectedTab == 0) {
                    // Employee Login Mode
                    Text(
                        text = "Sign in with your company employee credentials to register this handset.",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )

                    // Quick Demo Accounts
                    Text(
                        text = "Quick Demo Telecallers:",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFF1F5F9),
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    email = "rahul@acme.com"
                                    password = "Password123!"
                                }
                                .padding(8.dp)
                        ) {
                            Column {
                                Text("Rahul Verma", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("rahul@acme.com", fontSize = 10.sp, color = Color.Gray)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFF1F5F9),
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    email = "sneha@acme.com"
                                    password = "Password123!"
                                }
                                .padding(8.dp)
                        ) {
                            Column {
                                Text("Sneha Rao", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("sneha@acme.com", fontSize = 10.sp, color = Color.Gray)
                            }
                        }
                    }

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Employee Email") },
                        placeholder = { Text("employee@company.com") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            if (email.isBlank() || password.isBlank()) {
                                errorMessage = "Please enter employee email and password"
                                return@Button
                            }
                            isLoading = true
                            errorMessage = null

                            coroutineScope.launch {
                                try {
                                    val api = ApiClient.getService(baseUrl)
                                    val deviceId = "hw_${UUID.randomUUID().toString().take(12)}"
                                    val request = DeviceEnrollLoginRequest(
                                        email = email.trim(),
                                        password = password,
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

                                    val response = api.enrollDeviceWithCredentials(request)
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
                                        errorMessage = "Login failed: ${response.message()} (${response.code()})"
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
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Login & Enroll Handset", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                } else {
                    // Admin Token Mode
                    Text(
                        text = "Paste the enrollment token generated by your administrator in the Web Portal's Device Management page.",
                        fontSize = 12.sp,
                        color = Color.Gray
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
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Enroll with Token", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "Handset: ${Build.MANUFACTURER} ${Build.MODEL} • Android ${Build.VERSION.RELEASE}",
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = Color.Gray
        )
    }
}
