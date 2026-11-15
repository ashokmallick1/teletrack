package io.teletrack.android.recording

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File

object CallRecordingScanner {

    private const val TAG = "CallRecordingScanner"

    // Standard call recording directories across Indian & global Android OEMs
    private val RECORDING_DIRECTORIES = listOf(
        "Recordings/Call",                       // Samsung OneUI
        "Recordings/Call Recordings",            // OnePlus OxygenOS, Oppo ColorOS, RealmeUI
        "MIUI/sound_recorder/call_rec",          // Xiaomi / Redmi MIUI & HyperOS
        "Recordings",                            // Vivo FuntouchOS, Tecno, Infinix
        "VoiceRecorder",                         // Generic
        "Music/Recordings/Call Recordings"       // OnePlus / Oppo fallback
    )

    /**
     * Looks for a matching call recording file based on timestamp and phone number
     */
    fun findCallRecording(
        context: Context,
        phoneNumber: String,
        callTimestampEpochMs: Long,
        toleranceMs: Long = 180_000 // Within 3 minutes
    ): File? {
        val cleanNumber = phoneNumber.replace(Regex("[^0-9]"), "").takeLast(10)
        val storageRoot = Environment.getExternalStorageDirectory()

        for (dirPath in RECORDING_DIRECTORIES) {
            val dir = File(storageRoot, dirPath)
            if (!dir.exists() || !dir.isDirectory) continue

            try {
                val files = dir.listFiles { file ->
                    file.isFile && (
                        file.extension.equals("mp3", ignoreCase = true) ||
                        file.extension.equals("m4a", ignoreCase = true) ||
                        file.extension.equals("wav", ignoreCase = true) ||
                        file.extension.equals("amr", ignoreCase = true) ||
                        file.extension.equals("aac", ignoreCase = true)
                    )
                } ?: continue

                for (file in files) {
                    val lastModified = file.lastModified()
                    val diff = kotlin.math.abs(lastModified - callTimestampEpochMs)

                    // 1. Direct timestamp match within tolerance
                    if (diff <= toleranceMs) {
                        Log.d(TAG, "Found recording match by timestamp: ${file.absolutePath}")
                        return file
                    }

                    // 2. Filename contains matching phone digits
                    if (cleanNumber.isNotEmpty() && file.name.contains(cleanNumber)) {
                        Log.d(TAG, "Found recording match by phone number in filename: ${file.absolutePath}")
                        return file
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed reading recording directory $dirPath: ${e.message}")
            }
        }

        return null
    }
}
