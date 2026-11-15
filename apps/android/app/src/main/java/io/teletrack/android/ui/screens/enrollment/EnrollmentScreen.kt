package io.teletrack.android.ui.screens.enrollment

import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import io.teletrack.android.data.remote.ApiClient
import io.teletrack.android.data.remote.DeviceEnrollLoginRequest
import io.teletrack.android.data.remote.DeviceEnrollRegisterRequest
import io.teletrack.android.data.remote.DeviceEnrollmentRequest
import io.teletrack.android.security.TokenStorage
import kotlinx.coroutines.launch
import org.json.JSONObject
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
    var selectedTab by remember { mutableStateOf(0) } // 0 = Sign In, 1 = Register, 2 = Token

    // Sign In states
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loginOrgCode by remember { mutableStateOf("") }

    // Register states
    var registerMode by remember { mutableStateOf("JOIN_ORG") } // "JOIN_ORG" or "CREATE_ORG"
    var regOrgCode by remember { mutableStateOf("acme-teleservices") }
    var regCompanyName by remember { mutableStateOf("") }
    var regFullName by remember { mutableStateOf("") }
    var regEmail by remember { mutableStateOf("") }
    var regPassword by remember { mutableStateOf("") }

    // Token state
    var enrollmentToken by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var isPinging by remember { mutableStateOf(false) }
    var serverStatus by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun getHardwareId(): String {
        val androidId = try {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        } catch (e: Exception) {
            null
        }
        return if (!androidId.isNullOrBlank()) "hw_$androidId" else "hw_${UUID.randomUUID().toString().take(12)}"
    }

    fun parseErrorBody(rawError: String?, fallback: String): String {
        if (rawError.isNullOrBlank()) return fallback
        return try {
            val json = JSONObject(rawError)
            json.optString("message").ifBlank { fallback }
        } catch (e: Exception) {
            fallback
        }
    }

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
        Spacer(modifier = Modifier.height(8.dp))

        // Branding
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "T",
                color = Color.White,
                fontSize = 30.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "TeleTrack Mobile Agent",
            fontSize = 21.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Text(
            text = "Multi-Tenant SIM Call Analytics & CRM Sync",
            fontSize = 12.sp,
            color = Color.Gray
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Enrollment 3-Way Tabs: Sign In | Register | Token
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
                    onClick = {
                        selectedTab = 0
                        errorMessage = null
                    },
                    text = { Text("Sign In", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = {
                        selectedTab = 1
                        errorMessage = null
                    },
                    text = { Text("Register", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                )
                Tab(
                    selected = selectedTab == 2,
                    onClick = {
                        selectedTab = 2
                        errorMessage = null
                    },
                    text = { Text("Token", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Enrollment Card Body
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
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

                when (selectedTab) {
                    0 -> {
                        // TAB 0: EMPLOYEE SIGN IN
                        Text(
                            text = "Sign in with your User ID or Email and password to link this handset to your company.",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )

                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text("User ID or Email") },
                            placeholder = { Text("e.g. rahul01 or you@company.com") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
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

                        OutlinedTextField(
                            value = loginOrgCode,
                            onValueChange = { loginOrgCode = it },
                            label = { Text("Organization Code (Optional)") },
                            placeholder = { Text("e.g. acme-teleservices") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                if (email.isBlank() || password.isBlank()) {
                                    errorMessage = "Please enter your email and password"
                                    return@Button
                                }
                                isLoading = true
                                errorMessage = null

                                coroutineScope.launch {
                                    try {
                                        val api = ApiClient.getService(baseUrl)
                                        val deviceId = getHardwareId()
                                        val request = DeviceEnrollLoginRequest(
                                            email = email.trim(),
                                            password = password,
                                            orgCode = loginOrgCode.trim().ifBlank { null },
                                            deviceIdentifier = deviceId,
                                            deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                                            model = Build.MODEL,
                                            manufacturer = Build.MANUFACTURER,
                                            osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                                            appVersion = "1.1.0",
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
                                            val errStr = response.errorBody()?.string()
                                            errorMessage = parseErrorBody(errStr, "Login failed (${response.code()})")
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
                                Text("Sign In & Enroll Handset", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "New telecaller or new company? ",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                            Text(
                                text = "Tap Register →",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.clickable { selectedTab = 1 }
                            )
                        }
                    }

                    1 -> {
                        // TAB 1: SELF-REGISTER (JOIN COMPANY OR CREATE COMPANY)
                        Text(
                            text = "Register your employee account and enroll this handset in one step.",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = registerMode == "JOIN_ORG",
                                onClick = {
                                    registerMode = "JOIN_ORG"
                                    errorMessage = null
                                },
                                label = { Text("Join Company Code", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                                modifier = Modifier.weight(1f)
                            )
                            FilterChip(
                                selected = registerMode == "CREATE_ORG",
                                onClick = {
                                    registerMode = "CREATE_ORG"
                                    errorMessage = null
                                },
                                label = { Text("New Company", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        if (registerMode == "JOIN_ORG") {
                            OutlinedTextField(
                                value = regOrgCode,
                                onValueChange = { regOrgCode = it },
                                label = { Text("Organization Join Code") },
                                placeholder = { Text("e.g. acme-teleservices") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            Text(
                                text = "Ask your Admin for the Organization Join Code shown at the top of the Web Portal.",
                                fontSize = 11.sp,
                                color = Color(0xFF4F46E5)
                            )
                        } else {
                            OutlinedTextField(
                                value = regCompanyName,
                                onValueChange = { regCompanyName = it },
                                label = { Text("New Company / Organization Name") },
                                placeholder = { Text("e.g. Apex Real Estate Pvt Ltd") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        OutlinedTextField(
                            value = regFullName,
                            onValueChange = { regFullName = it },
                            label = { Text("Your Full Name") },
                            placeholder = { Text("e.g. Amit Kumar") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = regEmail,
                            onValueChange = { regEmail = it },
                            label = { Text("Email Address") },
                            placeholder = { Text("amit@company.com") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = regPassword,
                            onValueChange = { regPassword = it },
                            label = { Text("Create Password (min 6 chars)") },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                if (regFullName.isBlank() || regEmail.isBlank() || regPassword.length < 6) {
                                    errorMessage = "Please enter your full name, email, and a password (at least 6 characters)"
                                    return@Button
                                }
                                if (registerMode == "JOIN_ORG" && regOrgCode.isBlank()) {
                                    errorMessage = "Please enter your company's Organization Join Code"
                                    return@Button
                                }
                                if (registerMode == "CREATE_ORG" && regCompanyName.isBlank()) {
                                    errorMessage = "Please enter your new Company / Organization Name"
                                    return@Button
                                }

                                isLoading = true
                                errorMessage = null

                                coroutineScope.launch {
                                    try {
                                        val api = ApiClient.getService(baseUrl)
                                        val deviceId = getHardwareId()
                                        val request = DeviceEnrollRegisterRequest(
                                            mode = registerMode,
                                            orgCode = if (registerMode == "JOIN_ORG") regOrgCode.trim() else null,
                                            organizationName = if (registerMode == "CREATE_ORG") regCompanyName.trim() else null,
                                            fullName = regFullName.trim(),
                                            email = regEmail.trim(),
                                            password = regPassword,
                                            deviceIdentifier = deviceId,
                                            deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                                            model = Build.MODEL,
                                            manufacturer = Build.MANUFACTURER,
                                            osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                                            appVersion = "1.1.0",
                                            permissionGranted = true,
                                            simMetadata = mapOf(
                                                "board" to Build.BOARD,
                                                "device" to Build.DEVICE
                                            )
                                        )

                                        val response = api.registerAndEnrollDevice(request)
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
                                            val errStr = response.errorBody()?.string()
                                            errorMessage = parseErrorBody(errStr, "Registration failed (${response.code()})")
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
                                Text(
                                    if (registerMode == "JOIN_ORG") "Join Company & Enroll Phone" else "Create Company & Enroll Phone",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    2 -> {
                        // TAB 2: ADMIN SINGLE-USE TOKEN
                        Text(
                            text = "Paste the single-use enrollment token (ENROLL-XXXXXX) generated by your Admin in the Web Portal.",
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
                                        val deviceId = getHardwareId()
                                        val request = DeviceEnrollmentRequest(
                                            enrollmentToken = enrollmentToken.trim(),
                                            deviceIdentifier = deviceId,
                                            deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                                            model = Build.MODEL,
                                            manufacturer = Build.MANUFACTURER,
                                            osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                                            appVersion = "1.1.0",
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
                                            val errStr = response.errorBody()?.string()
                                            errorMessage = parseErrorBody(errStr, "Enrollment failed (${response.code()})")
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
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Server URL Section (Compact at bottom)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(1.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "TARGET CLOUD SERVER",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Gray,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val isTeleTrack = baseUrl.contains("teletrack.bhashaai.in")
                    FilterChip(
                        selected = isTeleTrack,
                        onClick = {
                            baseUrl = "https://teletrack.bhashaai.in"
                            testConnection()
                        },
                        label = { Text("teletrack", fontSize = 10.sp) },
                        modifier = Modifier.weight(1f)
                    )

                    val isDirectApi = baseUrl.contains("teletrack-api.bhashaai.in")
                    FilterChip(
                        selected = isDirectApi,
                        onClick = {
                            baseUrl = "https://teletrack-api.bhashaai.in"
                            testConnection()
                        },
                        label = { Text("Direct API", fontSize = 10.sp) },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = baseUrl,
                    onValueChange = {
                        baseUrl = it
                        serverStatus = null
                    },
                    label = { Text("Server URL", fontSize = 11.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = { testConnection() },
                        enabled = !isPinging
                    ) {
                        Text(if (isPinging) "Testing..." else "Test Connection", fontSize = 12.sp)
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

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "Handset: ${Build.MANUFACTURER} ${Build.MODEL} • Android ${Build.VERSION.RELEASE}",
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = Color.Gray
        )
    }
}
