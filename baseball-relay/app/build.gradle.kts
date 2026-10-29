plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val vc = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1

android {
    namespace = "kr.immanuel.relay"
    compileSdk = 35

    defaultConfig {
        applicationId = "kr.immanuel.relay"
        minSdk = 29
        targetSdk = 35
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
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
