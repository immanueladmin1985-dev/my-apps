plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val vc = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1

// 웹 앱(haru-helper/index.html 등)을 앱 안에 그대로 넣는다. 화면은 웹과 같은 파일 하나로 관리한다.
val copyWeb = tasks.register<Copy>("copyWeb") {
    from(rootProject.projectDir.parentFile) {
        include("index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png")
    }
    into(layout.buildDirectory.dir("webassets/web"))
}

android {
    namespace = "kr.immanuel.haru"
    compileSdk = 35

    defaultConfig {
        applicationId = "kr.immanuel.haru"
        minSdk = 29
        targetSdk = 34
        versionCode = vc
        versionName = "1.0.$vc"
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("webassets"))

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

tasks.named("preBuild") { dependsOn(copyWeb) }

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
