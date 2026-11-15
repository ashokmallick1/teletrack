package io.teletrack.android

import io.teletrack.android.data.remote.ApiClient
import org.junit.Assert.assertEquals
import org.junit.Test

class ApiClientTest {

    @Test
    fun testDefaultBaseUrl() {
        assertEquals("https://teletrack.bhashaai.in/", ApiClient.DEFAULT_BASE_URL)
    }

    @Test
    fun testUrlNormalization() {
        assertEquals("https://teletrack.bhashaai.in/", ApiClient.normalizeUrl("teletrack.bhashaai.in"))
        assertEquals("https://teletrack.bhashaai.in/", ApiClient.normalizeUrl("https://teletrack.bhashaai.in"))
        assertEquals("https://teletrack.bhashaai.in/", ApiClient.normalizeUrl("https://teletrack.bhashaai.in/"))
        assertEquals("https://teletrack-api.bhashaai.in/", ApiClient.normalizeUrl("teletrack-api.bhashaai.in"))
        assertEquals("http://10.0.2.2:4100/", ApiClient.normalizeUrl("http://10.0.2.2:4100"))
    }
}
