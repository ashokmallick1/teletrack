package io.callyzer.android.data.remote

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    const val DEFAULT_BASE_URL = "https://callyzer.bhashaai.in/"
    const val ALT_API_URL = "https://callyzer-api.bhashaai.in/"
    const val EMULATOR_DEV_URL = "http://10.0.2.2:4100/"

    private var retrofit: Retrofit? = null
    private var currentBaseUrl: String = DEFAULT_BASE_URL

    fun getService(baseUrl: String? = null): CallyzerApiService {
        val targetUrl = normalizeUrl(if (!baseUrl.isNullOrBlank()) baseUrl else currentBaseUrl)

        if (retrofit == null || currentBaseUrl != targetUrl) {
            currentBaseUrl = targetUrl
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(25, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .writeTimeout(25, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .retryOnConnectionFailure(true)
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(targetUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }

        return retrofit!!.create(CallyzerApiService::class.java)
    }

    fun normalizeUrl(rawUrl: String): String {
        val trimmed = rawUrl.trim()
        val withScheme = if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            "https://$trimmed"
        } else {
            trimmed
        }
        return if (withScheme.endsWith("/")) withScheme else "$withScheme/"
    }
}
