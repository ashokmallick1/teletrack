package io.callyzer.android.data.remote

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private var retrofit: Retrofit? = null
    private var currentBaseUrl: String = "http://10.0.2.2:4000/" // Android Emulator default to host machine

    fun getService(baseUrl: String? = null): CallyzerApiService {
        val targetUrl = if (!baseUrl.isNullOrBlank()) {
            if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        } else {
            currentBaseUrl
        }

        if (retrofit == null || currentBaseUrl != targetUrl) {
            currentBaseUrl = targetUrl
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(targetUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }

        return retrofit!!.create(CallyzerApiService::class.java)
    }
}
