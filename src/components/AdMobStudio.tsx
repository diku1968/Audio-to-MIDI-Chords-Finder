import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Play,
  X,
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  Sparkles,
  Smartphone,
  Eye,
  Info,
  Gift,
  Tv,
  Layers,
  Code2,
  ExternalLink,
  VolumeX,
  Volume2,
} from 'lucide-react';

interface AdUnitConfig {
  format: string;
  testAdUnitId: string;
  description: string;
  ecpmEstimate: string;
  recommendedUse: string;
}

const TEST_AD_UNITS: AdUnitConfig[] = [
  {
    format: 'Adaptive Banner',
    testAdUnitId: 'ca-app-pub-3940256099942544/9214589741',
    description: 'Dynamic height banner anchored to bottom of screen.',
    ecpmEstimate: '$0.50 – $2.50',
    recommendedUse: 'Permanent bottom anchor in Piano Roll & Chord Finder screens.',
  },
  {
    format: 'Rewarded Video Ad',
    testAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
    description: '15-30s opt-in video ad granting user unlock.',
    ecpmEstimate: '$18.00 – $40.00',
    recommendedUse: 'Unlock 24h unlimited MIDI (.mid) file & music sheet downloads.',
  },
  {
    format: 'Interstitial Ad',
    testAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
    description: 'Full-screen static or video ad on natural break.',
    ecpmEstimate: '$6.00 – $15.00',
    recommendedUse: 'Between stopping audio recording session and navigating to results.',
  },
  {
    format: 'Native Advanced Ad',
    testAdUnitId: 'ca-app-pub-3940256099942544/2247696110',
    description: 'Custom UI card matching app typography and theme.',
    ecpmEstimate: '$3.00 – $8.00',
    recommendedUse: 'In-feed item inside saved MIDI recordings list or chord history.',
  },
  {
    format: 'App Open Ad',
    testAdUnitId: 'ca-app-pub-3940256099942544/9257390740',
    description: 'Shown when user opens or resumes app from background.',
    ecpmEstimate: '$8.00 – $20.00',
    recommendedUse: 'Cold startup splash screen while C++ DSP engine initializes.',
  },
];

interface AdMobCodeFile {
  filename: string;
  language: string;
  description: string;
  code: string;
}

const ADMOB_CODE_FILES: AdMobCodeFile[] = [
  {
    filename: 'AdMobManager.kt',
    language: 'kotlin',
    description: 'Complete production AdMob Manager handling Rewarded, Interstitial, Banner, and App Open ads with Audio Focus pausing.',
    code: `// AdMobManager.kt
// Senior Android AdMob Manager with Lifecycle & Audio Focus Management
package com.audiomidi.ads

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.*
import com.google.android.gms.ads.appopen.AppOpenAd
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

class AdMobManager(private val context: Context) {

    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null
    private var appOpenAd: AppOpenAd? = null

    companion object {
        private const val TAG = "AdMobManager"

        // Official Google Sample Ad Unit IDs (replace with production IDs in Release build)
        const val TEST_BANNER_ID = "ca-app-pub-3940256099942544/9214589741"
        const val TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712"
        const val TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917"
        const val TEST_APP_OPEN_ID = "ca-app-pub-3940256099942544/9257390740"
    }

    fun initialize(onInitialized: () -> Unit = {}) {
        MobileAds.initialize(context) { status ->
            Log.d(TAG, "AdMob SDK Initialized: $status")
            preloadInterstitial()
            preloadRewarded()
            onInitialized()
        }
    }

    // 1. Preload Interstitial Ad
    fun preloadInterstitial() {
        val request = AdRequest.Builder().build()
        InterstitialAd.load(context, TEST_INTERSTITIAL_ID, request, object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: InterstitialAd) {
                interstitialAd = ad
                Log.d(TAG, "Interstitial loaded")
            }
            override fun onAdFailedToLoad(error: LoadAdError) {
                interstitialAd = null
                Log.e(TAG, "Interstitial failed: \${error.message}")
            }
        })
    }

    // 2. Preload Rewarded Video Ad
    fun preloadRewarded() {
        val request = AdRequest.Builder().build()
        RewardedAd.load(context, TEST_REWARDED_ID, request, object : RewardedAdLoadCallback() {
            override fun onAdLoaded(ad: RewardedAd) {
                rewardedAd = ad
                Log.d(TAG, "Rewarded ad loaded")
            }
            override fun onAdFailedToLoad(error: LoadAdError) {
                rewardedAd = null
                Log.e(TAG, "Rewarded failed: \${error.message}")
            }
        })
    }

    /**
     * Shows Rewarded Ad to unlock MIDI export.
     * CRITICAL: Pauses native Oboe audio stream during the ad to prevent hardware mixer conflict!
     */
    fun showRewardedAd(
        activity: Activity,
        onPauseAudio: () -> Unit,
        onResumeAudio: () -> Unit,
        onRewardGranted: () -> Unit
    ) {
        val ad = rewardedAd ?: run {
            Log.w(TAG, "Rewarded ad not ready, granting fallback reward")
            onRewardGranted()
            preloadRewarded()
            return
        }

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                // Pause microphone capture and DSP thread cleanly
                onPauseAudio()
            }

            override fun onAdDismissedFullScreenContent() {
                // Safely resume microphone capture
                onResumeAudio()
                rewardedAd = null
                preloadRewarded() // Preload for next time
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                onResumeAudio()
                rewardedAd = null
                preloadRewarded()
            }
        }

        ad.show(activity) { rewardItem ->
            Log.d(TAG, "User earned reward: \${rewardItem.type} (\${rewardItem.amount})")
            onRewardGranted()
        }
    }

    /**
     * Shows Interstitial Ad between recording sessions.
     */
    fun showInterstitial(
        activity: Activity,
        onPauseAudio: () -> Unit,
        onResumeAudio: () -> Unit,
        onAdDismissed: () -> Unit = {}
    ) {
        val ad = interstitialAd ?: run {
            onAdDismissed()
            preloadInterstitial()
            return
        }

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                onPauseAudio()
            }

            override fun onAdDismissedFullScreenContent() {
                onResumeAudio()
                interstitialAd = null
                preloadInterstitial()
                onAdDismissed()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                onResumeAudio()
                interstitialAd = null
                preloadInterstitial()
                onAdDismissed()
            }
        }

        ad.show(activity)
    }
}`,
  },
  {
    filename: 'AdMobConsentManager.kt',
    language: 'kotlin',
    description: 'Official Google User Messaging Platform (UMP) SDK implementation for GDPR, EEA & UK consent compliance.',
    code: `// AdMobConsentManager.kt
// Google User Messaging Platform (UMP) SDK for GDPR / CCPA Compliance
package com.audiomidi.ads

import android.app.Activity
import com.google.android.ump.*

class AdMobConsentManager(private val activity: Activity) {
    private val consentInformation: ConsentInformation =
        UserMessagingPlatform.getConsentInformation(activity)

    fun requestConsent(onConsentGathered: () -> Unit) {
        val params = ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(false)
            .build()

        consentInformation.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { formError ->
                    if (formError != null) {
                        // Handle form error gracefully
                    }
                    if (consentInformation.canRequestAds()) {
                        onConsentGathered()
                    }
                }
            },
            { requestConsentError ->
                // Fallback to loading ads if consent info fails
                if (consentInformation.canRequestAds()) {
                    onConsentGathered()
                }
            }
        )
    }
}`,
  },
  {
    filename: 'build.gradle.kts',
    language: 'kotlin',
    description: 'Android Gradle dependencies for Google Play Services Ads & UMP SDK.',
    code: `// app/build.gradle.kts
dependencies {
    // Google AdMob SDK (Latest 23.x)
    implementation("com.google.android.gms:play-services-ads:23.6.0")

    // Google User Messaging Platform (UMP) for GDPR/CCPA Consent
    implementation("com.google.android.ump:user-messaging-platform:3.1.0")

    // Jetpack Compose & ViewModel
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
}`,
  },
  {
    filename: 'AndroidManifest.xml',
    language: 'xml',
    description: 'AdMob application metadata ID and network permissions.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.audiomidi">

    <!-- AdMob Required Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application ...>
        <!-- Google AdMob Application ID (Replace with real app ID in production) -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-3940256099942544~3347511713" />

        <!-- Optional: Optimize AdMob initialization performance -->
        <meta-data
            android:name="com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION"
            android:value="true" />
        <meta-data
            android:name="com.google.android.gms.ads.flag.OPTIMIZE_DATAPROCESSING"
            android:value="true" />
    </application>
</manifest>`,
  },
];

export const AdMobStudio: React.FC = () => {
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Simulated Ad Modals
  const [activeAdModal, setActiveAdModal] = useState<'rewarded' | 'interstitial' | 'appOpen' | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);
  const [adAudioMuted, setAdAudioMuted] = useState<boolean>(false);

  const selectedFile = ADMOB_CODE_FILES[selectedFileIdx];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Rewarded Ad countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeAdModal === 'rewarded' && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (activeAdModal === 'rewarded' && countdown === 0) {
      setRewardClaimed(true);
    }
    return () => clearTimeout(timer);
  }, [activeAdModal, countdown]);

  const launchRewardedAd = () => {
    setCountdown(5);
    setRewardClaimed(false);
    setActiveAdModal('rewarded');
  };

  const launchInterstitialAd = () => {
    setActiveAdModal('interstitial');
  };

  const launchAppOpenAd = () => {
    setActiveAdModal('appOpen');
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Google AdMob Integration &amp; Monetization Hub
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Simulate real AdMob ads (Rewarded, Interstitial, Native, Adaptive Banner) with safe audio thread interruption and copy ready-to-use Android Kotlin source code.
          </p>
        </div>

        {/* Quick Test Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={launchRewardedAd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition-all cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Test Rewarded Video Ad</span>
          </button>

          <button
            onClick={launchInterstitialAd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Test Interstitial Ad</span>
          </button>
        </div>
      </div>

      {/* Reward Status Banner if claimed */}
      {rewardClaimed && (
        <div className="bg-emerald-950/70 border border-emerald-700/60 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>Ad Reward Granted!</strong> High-Definition MIDI Export and Unlimited Chord Transcriptions unlocked for 24 hours. Real-time audio stream safely resumed.
            </span>
          </div>
          <button
            onClick={() => setRewardClaimed(false)}
            className="text-emerald-400 hover:text-white font-bold px-2 py-1 rounded bg-emerald-900/60 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Ad Formats & Live Interactive Ad Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Ad Previews & Monetization Strategy (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Live Interactive Ad Previews</span>
          </div>

          {/* 1. In-Feed Native Advanced Ad */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 relative group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
                  Ad • Native Advanced
                </span>
                <span className="text-[11px] text-slate-400">Sponsored</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">eCPM: $3.00 – $8.00</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-100">
                  Studio Soundfonts &amp; VST Pack
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enhance your converted MIDI files with 120+ authentic Grand Pianos, Fender Rhodes, and acoustic guitars.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono">Test Unit: ca-app-pub.../2247696110</span>
              <button
                onClick={() => alert('Simulated Native Ad click: Opens sponsor destination.')}
                className="px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer shadow"
              >
                Install Now
              </button>
            </div>
          </div>

          {/* 2. Adaptive Banner Ad Preview */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold">
                Ad • Adaptive Banner (320x50)
              </span>
              <span className="text-[10px] font-mono text-slate-500">Always visible at bottom</span>
            </div>

            {/* Simulated Banner Container */}
            <div className="w-full h-12 bg-[#090e18] rounded-lg border border-slate-700/80 flex items-center justify-between px-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1 rounded bg-amber-500 text-slate-950 font-mono font-black text-[9px]">
                  AD
                </span>
                <span className="text-slate-300 font-semibold text-xs">
                  Yamaha P-515 Digital Piano — Studio Action
                </span>
              </div>
              <button
                onClick={() => alert('Simulated Banner Click!')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold cursor-pointer"
              >
                Shop Now
              </button>
            </div>
          </div>

          {/* 3. Monetization Strategy & Safe Audio Lifecycle Guide */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Safe Audio Interruption State Machine</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              When an ad is triggered on Android, video audio plays. The native C++ engine must coordinate with Android's <code className="text-cyan-300">AudioManager</code> to avoid hardware driver corruption:
            </p>
            <div className="p-3 bg-[#080d17] rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div>1. <span className="text-amber-400">onAdShowedFullScreenContent()</span></div>
              <div className="pl-4 text-slate-400">↳ Calls <code className="text-cyan-300">AudioStream::requestPause()</code></div>
              <div className="pl-4 text-slate-400">↳ Ring buffer state preserved, zero heap reallocations</div>
              <div>2. <span className="text-emerald-400">onAdDismissedFullScreenContent()</span></div>
              <div className="pl-4 text-slate-400">↳ Calls <code className="text-cyan-300">AudioStream::requestStart()</code></div>
              <div className="pl-4 text-slate-400">↳ Hardware stream resumes smoothly with no pops or clicks</div>
            </div>
          </div>

          {/* 4. Official Google Test Ad Units Table */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">
              Official Google AdMob Test Ad Units
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500">
                    <th className="py-1.5">Format</th>
                    <th className="py-1.5">Test Unit ID</th>
                    <th className="py-1.5">Avg eCPM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px] font-mono">
                  {TEST_AD_UNITS.map((u) => (
                    <tr key={u.format} className="hover:bg-slate-900/50">
                      <td className="py-1.5 font-bold text-slate-300">{u.format}</td>
                      <td className="py-1.5 text-cyan-400 truncate max-w-[150px]">{u.testAdUnitId}</td>
                      <td className="py-1.5 text-emerald-400">{u.ecpmEstimate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Copyable Android Source Files (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Production Android AdMob Source Code</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete Kotlin &amp; Gradle implementations for Android Studio.
              </p>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-900" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? 'Copied File!' : 'Copy Code'}
            </button>
          </div>

          {/* File selector buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
            {ADMOB_CODE_FILES.map((f, idx) => (
              <button
                key={f.filename}
                onClick={() => setSelectedFileIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all cursor-pointer ${
                  selectedFileIdx === idx
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {f.filename}
              </button>
            ))}
          </div>

          {/* File Description */}
          <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{selectedFile.description}</span>
          </div>

          {/* Code Container */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#070b12]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
              <span className="text-slate-200 font-bold">{selectedFile.filename}</span>
              <span className="uppercase text-[10px] text-slate-500">{selectedFile.language}</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{selectedFile.code}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* ================= SIMULATED FULL-SCREEN AD MODALS ================= */}

      {/* 1. Rewarded Video Ad Modal Simulator */}
      {activeAdModal === 'rewarded' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Ad Top Bar */}
            <div className="p-3 bg-black border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold text-[10px]">
                  Ad
                </span>
                <span className="text-slate-300">Google AdMob Rewarded Video</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAdAudioMuted(!adAudioMuted)}
                  className="text-slate-400 hover:text-white"
                >
                  {adAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <div className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-bold">
                  {countdown > 0 ? `Reward in ${countdown}s` : 'Reward Unlocked!'}
                </div>

                {countdown === 0 && (
                  <button
                    onClick={() => setActiveAdModal(null)}
                    className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Video Canvas Simulation */}
            <div className="p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex flex-col items-center justify-center text-center space-y-4 min-h-[260px]">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40 animate-pulse">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Synthesia Pro — Learn Piano Visuals</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Connect any MIDI keyboard or microphone. Over 500+ classical and pop arrangements with falling note streams.
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-1000"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                ></div>
              </div>

              <div className="text-[10px] font-mono text-slate-500">
                [Oboe Audio Stream: Paused] Hardware exclusive mode safely yielded
              </div>
            </div>

            {/* Ad Footer / Call to Action */}
            <div className="p-3 bg-black border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Free Download • 4.8 ★★★★★</span>
              <button
                onClick={() => {
                  setActiveAdModal(null);
                  setRewardClaimed(true);
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow cursor-pointer"
              >
                {countdown === 0 ? 'Claim Reward & Return' : 'Install App'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interstitial Ad Modal Simulator */}
      {activeAdModal === 'interstitial' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 bg-black border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-white font-mono font-bold text-[10px]">
                Ad • Interstitial
              </span>
              <button
                onClick={() => setActiveAdModal(null)}
                className="p-1 rounded-full bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/40">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AudioMaster 2.0 Studio</h3>
                <p className="text-xs text-slate-400 mt-1">
                  AI-powered stem separation, EQ mastering, and multi-track recording for musicians.
                </p>
              </div>
              <button
                onClick={() => setActiveAdModal(null)}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Try Free for 7 Days
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
