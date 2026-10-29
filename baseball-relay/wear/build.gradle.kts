plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val vc = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1

android {
    // 워치 앱과 폰 앱은 applicationId 와 서명이 같아야 서로 데이터를 주고받을 수 있다.
    namespace = "kr.immanuel.relay"
    compileSdk = 35

    defaultConfig {
        applicationId = "kr.immanuel.relay"
        minSdk = 30
        targetSdk = 34
        versionCode = vc
        versionName = "1.0.$vc"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    implementation("androidx.wear.tiles:tiles:1.4.1")
    implementation("androidx.wear.protolayout:protolayout:1.2.1")
    implementation("androidx.wear.watchface:watchface-complications-data-source-ktx:1.2.1")
    implementation("com.google.guava:guava:33.3.1-android")
}
