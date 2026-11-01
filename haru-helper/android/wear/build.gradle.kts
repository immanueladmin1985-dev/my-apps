plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val vc = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1

android {
    // 워치 앱과 폰 앱은 applicationId 와 서명이 같아야 서로 데이터를 주고받을 수 있다.
    namespace = "kr.immanuel.haru"
    compileSdk = 35

    defaultConfig {
        applicationId = "kr.immanuel.haru"
        minSdk = 30
        targetSdk = 34
        versionCode = vc
        versionName = "1.0.$vc"
    }

    // 폰 앱과 워치 앱이 같이 쓰는 코드 (요약 자료 해석, 시간 표시)
    sourceSets["main"].java.srcDir("../shared/java")

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
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    implementation("androidx.wear:wear-input:1.1.0")
    implementation("androidx.wear.tiles:tiles:1.4.1")
    implementation("androidx.wear.protolayout:protolayout:1.2.1")
    implementation("androidx.wear.watchface:watchface-complications-data-source-ktx:1.2.1")
    implementation("com.google.guava:guava:33.3.1-android")
}
