package io.callyzer.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Blue600 = Color(0xFF1367F6)
val Blue700 = Color(0xFF0D50E2)
val Emerald600 = Color(0xFF059669)
val Slate900 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Slate100 = Color(0xFFF1F5F9)
val Slate50 = Color(0xFFF8FAFC)

private val LightColorScheme = lightColorScheme(
    primary = Blue600,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD8EEFF),
    secondary = Emerald600,
    background = Slate50,
    surface = Color.White,
    onBackground = Slate900,
    onSurface = Slate900
)

@Composable
fun CallyzerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
