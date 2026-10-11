package io.callyzer.android.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface CallyzerApiService {

    @GET("api/v1/health")
    suspend fun checkHealth(): Response<ServerHealthResponse>

    @POST("api/v1/devices/enroll")
    suspend fun enrollDevice(
        @Body request: DeviceEnrollmentRequest
    ): Response<DeviceEnrollmentResponse>

    @POST("api/v1/devices/enroll-login")
    suspend fun enrollDeviceWithCredentials(
        @Body request: DeviceEnrollLoginRequest
    ): Response<DeviceEnrollmentResponse>

    @GET("api/v1/devices/me")
    suspend fun getDeviceStatus(
        @Header("x-device-api-key") apiKey: String
    ): Response<DeviceStatusResponse>

    @GET("api/v1/leads/assigned")
    suspend fun getAssignedLeads(
        @Header("x-device-api-key") apiKey: String
    ): Response<List<AssignedLeadDto>>

    @POST("api/v1/call-events/batch")
    suspend fun uploadCallBatch(
        @Header("x-device-api-key") apiKey: String,
        @Body request: IngestBatchRequest
    ): Response<IngestBatchResponse>
}
