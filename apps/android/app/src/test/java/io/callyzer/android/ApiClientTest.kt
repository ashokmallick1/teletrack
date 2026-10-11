package io.callyzer.android

import io.callyzer.android.data.remote.ApiClient
import org.junit.Assert.assertEquals
import org.junit.Test

class ApiClientTest {

    @Test
    fun testDefaultBaseUrl() {
        assertEquals("https://callyzer.bhashaai.in/", ApiClient.DEFAULT_BASE_URL)
    }

    @Test
    fun testUrlNormalization() {
        assertEquals("https://callyzer.bhashaai.in/", ApiClient.normalizeUrl("callyzer.bhashaai.in"))
        assertEquals("https://callyzer.bhashaai.in/", ApiClient.normalizeUrl("https://callyzer.bhashaai.in"))
        assertEquals("https://callyzer.bhashaai.in/", ApiClient.normalizeUrl("https://callyzer.bhashaai.in/"))
        assertEquals("https://callyzer-api.bhashaai.in/", ApiClient.normalizeUrl("callyzer-api.bhashaai.in"))
        assertEquals("http://10.0.2.2:4100/", ApiClient.normalizeUrl("http://10.0.2.2:4100"))
    }
}
