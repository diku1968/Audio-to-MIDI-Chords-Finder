import React, { useState } from 'react';
import {
  Smartphone,
  Code2,
  Copy,
  Check,
  Layers,
  Palette,
  Eye,
  Radio,
  Sliders,
  Play,
  Square,
  Volume2,
  Download,
  Activity,
  Info,
} from 'lucide-react';

interface AndroidLayoutFile {
  name: string;
  category: 'compose' | 'xml';
  language: string;
  description: string;
  code: string;
}

const ANDROID_LAYOUT_FILES: AndroidLayoutFile[] = [
  {
    name: 'AudioMidiScreen.kt',
    category: 'compose',
    language: 'kotlin',
    description: 'Modern Jetpack Compose Material 3 root layout with Scaffold, reactive StateFlow bindings, TopAppBar, Cards, and bottom AdMob Banner.',
    code: `// AudioMidiScreen.kt
// Jetpack Compose Material 3 Layout for Audio-to-MIDI & Chords Finder
package com.audiomidi.ui

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.audiomidi.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AudioMidiScreen(
    viewModel: AudioMidiViewModel,
    onExportMidiClicked: () -> Unit
) {
    val isRecording by viewModel.isRecording.collectAsStateWithLifecycle()
    val pitchState by viewModel.pitchState.collectAsStateWithLifecycle()
    val chordState by viewModel.chordState.collectAsStateWithLifecycle()
    val notesHistory by viewModel.notesHistory.collectAsStateWithLifecycle()
    val chromaValues by viewModel.chromaValues.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Audio-to-MIDI & Chords",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (isRecording) "DSP Engine: ACTIVE (48 kHz AAudio)" else "Engine: Standby",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isRecording) Color(0xFF38BDF8) else Color(0xFF94A3B8)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onExportMidiClicked) {
                        Icon(Icons.Default.Share, contentDescription = "Export MIDI")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF090E17),
                    titleContentColor = Color.White
                )
            )
        },
        bottomBar = {
            // Google AdMob Adaptive Banner pinned at bottom
            AdMobBannerView(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF090E17))
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.toggleRecording() },
                containerColor = if (isRecording) Color(0xFFE11D48) else Color(0xFF059669),
                contentColor = Color.White
            ) {
                Icon(
                    imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.PlayArrow,
                    contentDescription = if (isRecording) "Stop Detection" else "Start Detection"
                )
            }
        },
        containerColor = Color(0xFF070B12)
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Spacer(modifier = Modifier.height(2.dp))

            // 1. Live Pitch & Tuner Card
            PitchTunerCard(
                pitchState = pitchState,
                modifier = Modifier.fillMaxWidth()
            )

            // 2. Real-Time Chord Recognition Card
            ChordRecognitionCard(
                chordState = chordState,
                modifier = Modifier.fillMaxWidth()
            )

            // 3. Hardware-Accelerated Scrolling Piano Roll Canvas
            Text(
                text = "REAL-TIME MIDI PIANO ROLL",
                style = MaterialTheme.typography.labelSmall,
                color = Color(0xFF94A3B8),
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
            )
            PianoRollCanvas(
                notes = notesHistory,
                activeMidi = pitchState?.midiNote,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF090D16))
                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
            )

            // 4. 12-Bin Chromagram EQ Visualizer
            ChromagramBarChart(
                chromaValues = chromaValues,
                activeChordNotes = chordState?.notes ?: emptyList(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(110.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF090D16))
                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                    .padding(8.dp)
            )

            Spacer(modifier = Modifier.height(60.dp)) // Space for FAB
        }
    }
}`,
  },
  {
    name: 'PianoRollCanvas.kt',
    category: 'compose',
    language: 'kotlin',
    description: 'Custom hardware-accelerated Jetpack Compose Canvas rendering MIDI note blocks, time markers, and piano keys at 120 FPS.',
    code: `// PianoRollCanvas.kt
package com.audiomidi.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import com.audiomidi.model.MidiNoteEvent

private const val MIN_MIDI = 36 // C2
private const val MAX_MIDI = 84 // C6
private const val TOTAL_KEYS = MAX_MIDI - MIN_MIDI + 1

@Composable
fun PianoRollCanvas(
    notes: List<MidiNoteEvent>,
    activeMidi: Int?,
    currentTimeSec: Float = 0f,
    modifier: Modifier = Modifier,
    onKeyClicked: ((Int) -> Unit)? = null
) {
    Canvas(
        modifier = modifier.pointerInput(Unit) {
            detectTapGestures { offset ->
                if (offset.x < 50.dp.toPx()) {
                    val keyHeight = size.height / TOTAL_KEYS
                    val keyIdx = (offset.y / keyHeight).toInt()
                    val midi = MAX_MIDI - keyIdx
                    onKeyClicked?.invoke(midi)
                }
            }
        }
    ) {
        val pianoWidth = 44.dp.toPx()
        val rollWidth = size.width - pianoWidth
        val keyHeight = size.height / TOTAL_KEYS
        val timeWindow = 8.0f // 8 seconds visible
        val timeScale = rollWidth / timeWindow
        val visibleStart = maxOf(0f, currentTimeSec - 6.5f)

        // 1. Draw Grid and Piano Keys Column
        for (m in MAX_MIDI downTo MIN_MIDI) {
            val y = (MAX_MIDI - m) * keyHeight
            val pitchClass = m % 12
            val isBlackKey = pitchClass in listOf(1, 3, 6, 8, 10)
            val isCKey = pitchClass == 0

            // Grid background
            drawRect(
                color = if (isBlackKey) Color(0xFF0C1220) else Color(0xFF111827),
                topLeft = Offset(pianoWidth, y),
                size = Size(rollWidth, keyHeight)
            )

            // Horizontal grid divider
            drawLine(
                color = if (isCKey) Color(0x3338BDF8) else Color(0x0AFFFFFF),
                start = Offset(pianoWidth, y),
                end = Offset(size.width, y),
                strokeWidth = 1f
            )

            // Piano Key
            val isActive = activeMidi == m
            val keyColor = when {
                isActive -> Color(0xFF38BDF8)
                isBlackKey -> Color(0xFF1E293B)
                else -> Color(0xFFCBD5E1)
            }
            drawRect(
                color = keyColor,
                topLeft = Offset(0f, y),
                size = Size(pianoWidth - 2f, keyHeight)
            )
        }

        // 2. Draw Detected MIDI Note Blocks
        for (note in notes) {
            if (note.noteNumber !in MIN_MIDI..MAX_MIDI) continue
            val noteEnd = if (note.isActive) currentTimeSec else note.startTime + note.duration
            if (noteEnd < visibleStart || note.startTime > visibleStart + timeWindow) continue

            val x = pianoWidth + (note.startTime - visibleStart) * timeScale
            val width = maxOf(4f, (noteEnd - note.startTime) * timeScale)
            val y = (MAX_MIDI - note.noteNumber) * keyHeight

            val noteColor = when {
                note.isActive -> Color(0xFF06B6D4)
                note.centsOff > 10 -> Color(0xFFF59E0B)  // Sharp (Amber)
                note.centsOff < -10 -> Color(0xFFEC4899) // Flat (Pink)
                else -> Color(0xFF10B981)                // In-Tune (Emerald)
            }

            drawRoundRect(
                color = noteColor,
                topLeft = Offset(maxOf(pianoWidth, x), y + 1f),
                size = Size(width - 1f, keyHeight - 2f),
                cornerRadius = CornerRadius(4f, 4f)
            )
        }
    }
}`,
  },
  {
    name: 'AdMobBannerView.kt',
    category: 'compose',
    language: 'kotlin',
    description: 'Memory-leak-free Google AdMob Adaptive Banner integration using Jetpack Compose AndroidView with DisposableEffect.',
    code: `// AdMobBannerView.kt
package com.audiomidi.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.*

@Composable
fun AdMobBannerView(
    modifier: Modifier = Modifier,
    adUnitId: String = "ca-app-pub-3940256099942544/6300978111" // Google Sample Banner ID
) {
    val context = LocalContext.current
    val adView = remember {
        AdView(context).apply {
            setAdSize(AdSize.BANNER)
            this.adUnitId = adUnitId
        }
    }

    // Crucial: DisposableEffect destroys AdView to prevent Context memory leaks
    DisposableEffect(adView) {
        val adRequest = AdRequest.Builder().build()
        adView.loadAd(adRequest)

        onDispose {
            adView.destroy()
        }
    }

    AndroidView(
        factory = { adView },
        modifier = modifier.fillMaxWidth()
    )
}`,
  },
  {
    name: 'activity_main.xml',
    category: 'xml',
    language: 'xml',
    description: 'Traditional Android XML Layout using ConstraintLayout, MaterialToolbar, CardViews, custom PianoRollView, and AdMob AdView.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<!-- res/layout/activity_main.xml -->
<androidx.coordinatorlayout.widget.CoordinatorLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#070B12">

    <!-- Top AppBar -->
    <com.google.android.material.appbar.AppBarLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="#090E17">

        <com.google.android.material.appbar.MaterialToolbar
            android:id="@+id/toolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize"
            app:title="Audio-to-MIDI &amp; Chords"
            app:titleTextColor="#FFFFFF"
            app:subtitle="Real-time Android DSP Engine"
            app:subtitleTextColor="#38BDF8"
            app:menu="@menu/menu_main" />
    </com.google.android.material.appbar.AppBarLayout>

    <!-- Main Scrollable Content -->
    <androidx.core.widget.NestedScrollView
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:fillViewport="true"
        android:paddingBottom="60dp"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <androidx.constraintlayout.widget.ConstraintLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:padding="16dp">

            <!-- Pitch & Tuner Card -->
            <com.google.android.material.card.MaterialCardView
                android:id="@+id/cardPitch"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                app:cardBackgroundColor="#0D1424"
                app:cardCornerRadius="14dp"
                app:strokeColor="#1E293B"
                app:strokeWidth="1dp"
                app:layout_constraintTop_toTopOf="parent"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:orientation="vertical"
                    android:padding="16dp">

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="YIN PITCH ESTIMATOR"
                        android:textColor="#38BDF8"
                        android:textSize="11sp"
                        android:textStyle="bold"
                        android:fontFamily="monospace" />

                    <TextView
                        android:id="@+id/tvNoteName"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="A4"
                        android:textColor="#FFFFFF"
                        android:textSize="44sp"
                        android:textStyle="bold"
                        android:fontFamily="monospace"
                        android:layout_gravity="center_horizontal" />

                    <TextView
                        android:id="@+id/tvFrequency"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="440.0 Hz • MIDI 69"
                        android:textColor="#94A3B8"
                        android:textSize="12sp"
                        android:layout_gravity="center_horizontal" />

                    <!-- Cents Deviation Progress/Needle -->
                    <com.google.android.material.progressindicator.LinearProgressIndicator
                        android:id="@+id/progressCents"
                        android:layout_width="match_parent"
                        android:layout_height="8dp"
                        android:layout_marginTop="12dp"
                        android:max="100"
                        android:progress="50"
                        app:indicatorColor="#10B981"
                        app:trackColor="#1E293B"
                        app:trackCornerRadius="4dp" />
                </LinearLayout>
            </com.google.android.material.card.MaterialCardView>

            <!-- Real-Time Chord Card -->
            <com.google.android.material.card.MaterialCardView
                android:id="@+id/cardChords"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginTop="12dp"
                app:cardBackgroundColor="#0D1424"
                app:cardCornerRadius="14dp"
                app:strokeColor="#1E293B"
                app:strokeWidth="1dp"
                app:layout_constraintTop_toBottomOf="@id/cardPitch"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:orientation="vertical"
                    android:padding="16dp">

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="CHROMAGRAM CHORD RECOGNITION"
                        android:textColor="#F59E0B"
                        android:textSize="11sp"
                        android:textStyle="bold"
                        android:fontFamily="monospace" />

                    <TextView
                        android:id="@+id/tvChordName"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="C Major"
                        android:textColor="#F59E0B"
                        android:textSize="38sp"
                        android:textStyle="bold"
                        android:layout_gravity="center_horizontal" />

                    <TextView
                        android:id="@+id/tvChordNotes"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="Formula: C - E - G • 94% Confidence"
                        android:textColor="#94A3B8"
                        android:textSize="12sp"
                        android:layout_gravity="center_horizontal" />
                </LinearLayout>
            </com.google.android.material.card.MaterialCardView>

            <!-- Custom Piano Roll View -->
            <com.audiomidi.ui.custom.PianoRollView
                android:id="@+id/pianoRollView"
                android:layout_width="0dp"
                android:layout_height="200dp"
                android:layout_marginTop="12dp"
                android:background="#090D16"
                app:layout_constraintTop_toBottomOf="@id/cardChords"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent" />

            <!-- Chromagram 12-Bin EQ View -->
            <com.audiomidi.ui.custom.ChromagramView
                android:id="@+id/chromagramView"
                android:layout_width="0dp"
                android:layout_height="100dp"
                android:layout_marginTop="12dp"
                android:background="#090D16"
                app:layout_constraintTop_toBottomOf="@id/pianoRollView"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent" />

        </androidx.constraintlayout.widget.ConstraintLayout>
    </androidx.core.widget.NestedScrollView>

    <!-- Floating Record Action Button -->
    <com.google.android.material.floatingactionbutton.FloatingActionButton
        android:id="@+id/fabRecord"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom|end"
        android:layout_margin="16dp"
        android:layout_marginBottom="64dp"
        android:contentDescription="Record"
        app:backgroundTint="#059669"
        app:srcCompat="@drawable/ic_play"
        app:tint="#FFFFFF" />

    <!-- Google AdMob Adaptive Banner at bottom -->
    <com.google.android.gms.ads.AdView
        android:id="@+id/adView"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom"
        android:background="#090E17"
        app:adSize="BANNER"
        app:adUnitId="ca-app-pub-3940256099942544/6300978111" />

</androidx.coordinatorlayout.widget.CoordinatorLayout>`,
  },
  {
    name: 'colors.xml & themes.xml',
    category: 'xml',
    language: 'xml',
    description: 'Material 3 Dark Audio DAW theme palette and typography definitions.',
    code: `<!-- res/values/colors.xml -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Backgrounds -->
    <color name="daw_background">#070B12</color>
    <color name="daw_surface">#0D1424</color>
    <color name="daw_topbar">#090E17</color>
    <color name="daw_border">#1E293B</color>

    <!-- Audio Brand Accents -->
    <color name="daw_cyan">#38BDF8</color>
    <color name="daw_amber">#F59E0B</color>
    <color name="daw_emerald">#10B981</color>
    <color name="daw_rose">#E11D48</color>

    <!-- Text & Grid -->
    <color name="daw_text_primary">#F8FAFC</color>
    <color name="daw_text_secondary">#94A3B8</color>
    <color name="daw_piano_white_key">#CBD5E1</color>
    <color name="daw_piano_black_key">#1E293B</color>
</resources>

<!-- res/values/themes.xml -->
<resources>
    <style name="Theme.AudioMidi" parent="Theme.Material3.Dark.NoActionBar">
        <item name="android:statusBarColor">#090E17</item>
        <item name="android:navigationBarColor">#090E17</item>
        <item name="colorPrimary">@color/daw_cyan</item>
        <item name="colorSecondary">@color/daw_amber</item>
        <item name="android:windowBackground">@color/daw_background</item>
    </style>
</resources>`,
  },
];

export const AndroidLayoutStudio: React.FC = () => {
  const [activeLayoutCategory, setActiveLayoutCategory] = useState<'compose' | 'xml'>('compose');
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Phone Mockup interactive state
  const [mockRecording, setMockRecording] = useState<boolean>(true);
  const [mockPitchNote, setMockPitchNote] = useState<string>('A4');
  const [mockPitchHz, setMockPitchHz] = useState<number>(440.0);
  const [mockCents, setMockCents] = useState<number>(3);
  const [mockChord, setMockChord] = useState<string>('C Maj');
  const [mockChordNotes, setMockChordNotes] = useState<string[]>(['C', 'E', 'G']);

  const filteredFiles = ANDROID_LAYOUT_FILES.filter((f) => f.category === activeLayoutCategory);
  const currentFile = filteredFiles[selectedFileIdx] || filteredFiles[0];

  const handleCopy = () => {
    if (currentFile) {
      navigator.clipboard.writeText(currentFile.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Android Layout Studio (Jetpack Compose &amp; XML Views)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Preview the exact mobile Android layout inside an interactive device simulator, and inspect production-ready Jetpack Compose Material 3 &amp; Classic XML code.
          </p>
        </div>

        {/* Paradigm Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => {
              setActiveLayoutCategory('compose');
              setSelectedFileIdx(0);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeLayoutCategory === 'compose'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Jetpack Compose (Modern)</span>
          </button>

          <button
            onClick={() => {
              setActiveLayoutCategory('xml');
              setSelectedFileIdx(0);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeLayoutCategory === 'xml'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Classic XML Layout</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Device Mockup (Left) + Code Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Interactive Android Phone Mockup (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Live Android Phone Mockup Preview</span>
          </div>

          {/* Device Shell (Pixel 8 / Samsung S24 chassis) */}
          <div className="w-[340px] h-[690px] bg-black rounded-[44px] p-3 shadow-2xl border-4 border-slate-700 relative flex flex-col overflow-hidden">
            {/* Top Notch / Camera hole */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800"></div>
            </div>

            {/* Android Device Screen */}
            <div className="w-full h-full bg-[#070B12] rounded-[36px] overflow-hidden flex flex-col text-slate-100 select-none relative border border-slate-900">
              {/* Android Status Bar */}
              <div className="pt-2 px-6 pb-1 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#090E17]">
                <span>12:00</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Material 3 TopAppBar */}
              <div className="px-4 py-2.5 bg-[#090E17] border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-white">Audio-to-MIDI &amp; Chords</div>
                  <div className="text-[10px] text-cyan-400 font-mono">
                    {mockRecording ? '● AAUDIO 48 kHz (0 xruns)' : 'Engine: Standby'}
                  </div>
                </div>
                <div className="p-1 rounded bg-slate-800 text-slate-300">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Scrollable Android Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* 1. Pitch & Tuner Card */}
                <div className="bg-[#0D1424] p-3 rounded-xl border border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                    <span>YIN PITCH TUNER</span>
                    <span>{mockPitchHz.toFixed(1)} Hz</span>
                  </div>
                  <div className="py-2 text-center">
                    <div className="text-3xl font-black font-mono text-white tracking-tight">
                      {mockPitchNote}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      MIDI 69 • {mockCents > 0 ? `+${mockCents}` : mockCents} cents offset
                    </div>
                    {/* Cents Needle */}
                    <div className="relative w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden border border-slate-800">
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-500 -translate-x-1/2"></div>
                      <div
                        className="absolute top-0 bottom-0 w-2 rounded bg-emerald-400"
                        style={{ left: `${50 + mockCents}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 2. Chord Recognition Card */}
                <div className="bg-[#0D1424] p-3 rounded-xl border border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                    <span>REAL-TIME CHORD</span>
                    <span className="text-emerald-400 font-bold">96% Conf</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-black text-amber-400">{mockChord}</div>
                      <div className="text-[10px] text-slate-400">
                        Notes: {mockChordNotes.join(' - ')}
                      </div>
                    </div>

                    {/* Mini Piano Octave */}
                    <div className="flex h-8 bg-black p-0.5 rounded border border-slate-800">
                      {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((k) => (
                        <div
                          key={k}
                          className={`w-2.5 h-full border-r border-slate-800 rounded-b-[1px] ${
                            mockChordNotes.includes(k) ? 'bg-amber-400' : 'bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Scrolling Piano Roll Card */}
                <div className="bg-[#090D16] p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>LIVE MIDI PIANO ROLL</span>
                    <span className="text-cyan-400">C2 - C6</span>
                  </div>
                  <div className="h-24 bg-slate-950 rounded-lg border border-slate-900 relative overflow-hidden flex flex-col justify-around p-1">
                    {/* Simulated Piano Roll Grid */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-20">
                      <div className="border-b border-cyan-500 w-full"></div>
                      <div className="border-b border-slate-700 w-full"></div>
                      <div className="border-b border-slate-700 w-full"></div>
                      <div className="border-b border-slate-700 w-full"></div>
                    </div>
                    {/* Floating MIDI Notes */}
                    <div className="w-14 h-3 rounded bg-cyan-400 ml-8 shadow-sm"></div>
                    <div className="w-20 h-3 rounded bg-emerald-400 ml-20 shadow-sm"></div>
                    <div className="w-16 h-3 rounded bg-amber-400 ml-40 shadow-sm"></div>
                    <div className="w-24 h-3 rounded bg-cyan-400 ml-12 shadow-sm"></div>
                  </div>
                </div>

                {/* 4. 12-Bin Chromagram EQ */}
                <div className="bg-[#090D16] p-2 rounded-xl border border-slate-800">
                  <div className="text-[9px] font-mono text-slate-400 mb-1">
                    12-BIN PITCH CLASS PROFILE
                  </div>
                  <div className="grid grid-cols-12 gap-0.5 h-10 items-end bg-black p-1 rounded">
                    {[0.9, 0.1, 0.2, 0.1, 0.8, 0.2, 0.1, 0.85, 0.1, 0.2, 0.1, 0.15].map((h, i) => (
                      <div
                        key={i}
                        className={`w-full rounded-t ${h > 0.6 ? 'bg-amber-400' : 'bg-slate-700'}`}
                        style={{ height: `${h * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Action Button (Record) */}
              <button
                onClick={() => setMockRecording(!mockRecording)}
                className={`absolute bottom-16 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer z-20 ${
                  mockRecording
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40'
                }`}
              >
                {mockRecording ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {/* Google AdMob Adaptive Banner at Bottom */}
              <div className="h-12 bg-[#090E17] border-t border-slate-800 flex items-center justify-center px-2 z-10">
                <div className="w-full h-8 bg-slate-900 border border-slate-700/60 rounded flex items-center justify-between px-3 text-[10px] text-slate-400">
                  <span className="font-mono text-amber-400 font-bold">[Ad]</span>
                  <span>Google AdMob Adaptive 320x50 Banner</span>
                  <span className="text-[8px] text-slate-600 font-mono">TEST_ID</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive controls for phone mockup */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Switch chord in mockup:</span>
            {['C Maj', 'Am7', 'G7', 'F#m'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setMockChord(c);
                  if (c === 'C Maj') {
                    setMockChordNotes(['C', 'E', 'G']);
                    setMockPitchNote('C4');
                    setMockPitchHz(261.6);
                  } else if (c === 'Am7') {
                    setMockChordNotes(['A', 'C', 'E', 'G']);
                    setMockPitchNote('A4');
                    setMockPitchHz(440.0);
                  } else if (c === 'G7') {
                    setMockChordNotes(['G', 'B', 'D', 'F']);
                    setMockPitchNote('G4');
                    setMockPitchHz(392.0);
                  } else {
                    setMockChordNotes(['F#', 'A', 'C#']);
                    setMockPitchNote('F#4');
                    setMockPitchHz(369.9);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  mockChord === c ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Production Code Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>
                  {activeLayoutCategory === 'compose' ? 'Jetpack Compose Code' : 'Android XML Layout Code'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ready to copy directly into your Android project.
              </p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition-all cursor-pointer self-start sm:self-auto"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied File!' : 'Copy Code'}
            </button>
          </div>

          {/* File Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
            {filteredFiles.map((f, idx) => (
              <button
                key={f.name}
                onClick={() => setSelectedFileIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all cursor-pointer ${
                  selectedFileIdx === idx
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* File description */}
          <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{currentFile.description}</span>
          </div>

          {/* Code Viewer */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#070b12]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
              <span className="text-slate-200 font-bold">{currentFile.name}</span>
              <span className="uppercase text-[10px] text-slate-500">{currentFile.language}</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{currentFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
