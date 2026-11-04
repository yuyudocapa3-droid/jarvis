package com.jarvis.assistant

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(3, 9, 20)
        window.navigationBarColor = Color.rgb(3, 9, 20)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(3, 9, 20))
        }
        val controls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(12, 8, 12, 8)
            setBackgroundColor(Color.rgb(5, 20, 34))
        }
        val title = TextView(this).apply {
            text = "J.A.R.V.I.S."
            textSize = 15f
            letterSpacing = 0.18f
            setTextColor(Color.rgb(125, 235, 255))
            setPadding(4, 8, 8, 8)
        }
        val miniButton = Button(this).apply {
            text = "ATIVAR MODO MINI"
            textSize = 10f
            setOnClickListener { enableFloatingMode() }
        }
        controls.addView(title, LinearLayout.LayoutParams(0, -2, 1f))
        controls.addView(miniButton)

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(3, 9, 20))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            loadUrl(BuildConfig.JARVIS_URL)
        }

        root.addView(controls, LinearLayout.LayoutParams(-1, -2))
        root.addView(webView, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
    }

    private fun enableFloatingMode() {
        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Autorize 'sobrepor a outros apps' para usar o modo mini.", Toast.LENGTH_LONG).show()
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
            return
        }
        val service = Intent(this, FloatingOverlayService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(service)
        else startService(service)
        Toast.makeText(this, "JARVIS mini ativado. Você pode voltar para outro app.", Toast.LENGTH_SHORT).show()
    }

    override fun onResume() {
        super.onResume()
        // O usuário retorna das configurações; um segundo toque ativa o modo mini.
    }

    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
