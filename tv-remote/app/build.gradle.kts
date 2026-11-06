plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val vc = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1

android {
    namespace = "kr.immanuel.tvremote"
    compileSdk = 35

    defaultConfig {
        applicationId = "kr.immanuel.tvremote"
        minSdk = 29
        targetSdk = 34
        versionCode = vc
        versionName = "1.0.$vc"
    }

    // 폰 앱과 워치 앱이 같이 쓰는 코드 (모드 형식, 구글 TV 메시지)
    sourceSets["main"].java.srcDir("../shared/java")
    sourceSets["test"].java.srcDir("../shared/test")

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    packaging {
        resources.excludes += setOf("META-INF/versions/9/OSGI-INF/MANIFEST.MF", "META-INF/BCKEY.*", "META-INF/LICENSE*", "META-INF/NOTICE*")
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
    // 구글 TV 페어링용 인증서를 만들 때만 쓴다
    implementation("org.bouncycastle:bcpkix-jdk18on:1.78.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
