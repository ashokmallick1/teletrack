package io.teletrack.android.data.remote

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface TeleTrackApiService {

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

    @POST("api/v1/devices/enroll-register")
    suspend fun registerAndEnrollDevice(
        @Body request: DeviceEnrollRegisterRequest
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

    @Multipart
    @POST("api/v1/call-recordings/upload")
    suspend fun uploadCallRecording(
        @Header("x-device-api-key") apiKey: String,
        @Part("callId") callId: RequestBody?,
        @Part("sourceCallId") sourceCallId: RequestBody?,
        @Part("phoneNumber") phoneNumber: RequestBody?,
        @Part("durationSeconds") durationSeconds: RequestBody?,
        @Part recording: MultipartBody.Part
    ): Response<RecordingUploadResponse>
}
