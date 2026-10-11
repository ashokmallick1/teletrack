package io.callyzer.android.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface CallyzerApiService {

    @POST("api/v1/devices/enroll")
    suspend fun enrollDevice(
        @Body request: DeviceEnrollmentRequest
    ): Response<DeviceEnrollmentResponse>

    @POST("api/v1/call-events/batch")
    suspend fun uploadCallBatch(
        @Header("x-device-api-key") apiKey: String,
        @Body request: IngestBatchRequest
    ): Response<IngestBatchResponse>
}
