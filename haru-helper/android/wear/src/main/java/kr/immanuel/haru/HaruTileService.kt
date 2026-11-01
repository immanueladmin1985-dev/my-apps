package kr.immanuel.haru

import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.LayoutElementBuilders.Box
import androidx.wear.protolayout.LayoutElementBuilders.Column
import androidx.wear.protolayout.LayoutElementBuilders.FontStyle
import androidx.wear.protolayout.LayoutElementBuilders.LayoutElement
import androidx.wear.protolayout.LayoutElementBuilders.Row
import androidx.wear.protolayout.LayoutElementBuilders.Spacer
import androidx.wear.protolayout.LayoutElementBuilders.Text
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/** 워치 타일: 지금 할 일, 다음 알림, 숨 고르기·말로 메모·대화 타이머 단추. */
class HaruTileService : TileService() {

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion("1")
            .setFreshnessIntervalMillis(10 * 60_000L)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(WStore.snap(this))))
            .build()
        return Futures.immediateFuture(tile)
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion("1").build())

    private fun text(s: String, size: Float, color: Int = WHITE, bold: Boolean = false, lines: Int = 1): LayoutElement =
        Text.Builder()
            .setText(s)
            .setMaxLines(lines)
            .setFontStyle(
                FontStyle.Builder()
                    .setSize(sp(size))
                    .setColor(argb(color))
                    .setWeight(if (bold) LayoutElementBuilders.FONT_WEIGHT_BOLD else LayoutElementBuilders.FONT_WEIGHT_NORMAL)
                    .build()
            )
            .build()

    private fun gap(h: Float): LayoutElement = Spacer.Builder().setHeight(dp(h)).build()

    private fun launch(cls: Class<*>, extra: String? = null): ModifiersBuilders.Clickable {
        val act = ActionBuilders.AndroidActivity.Builder().setPackageName(packageName).setClassName(cls.name)
        if (extra != null) act.addKeyToExtraMapping("open", ActionBuilders.AndroidStringExtra.Builder().setValue(extra).build())
        return ModifiersBuilders.Clickable.Builder()
            .setId(cls.simpleName + (extra ?: ""))
            .setOnClick(ActionBuilders.LaunchAction.Builder().setAndroidActivity(act.build()).build())
            .build()
    }

    /** 둥근 단추 (이모지 하나). */
    private fun circle(emoji: String, color: Int, click: ModifiersBuilders.Clickable): LayoutElement =
        Box.Builder()
            .setWidth(dp(46f))
            .setHeight(dp(46f))
            .setModifiers(
                ModifiersBuilders.Modifiers.Builder()
                    .setClickable(click)
                    .setBackground(
                        ModifiersBuilders.Background.Builder()
                            .setColor(argb(color))
                            .setCorner(ModifiersBuilders.Corner.Builder().setRadius(dp(23f)).build())
                            .build()
                    ).build()
            )
            .addContent(text(emoji, 20f))
            .build()

    private fun hgap(w: Float): LayoutElement = Spacer.Builder().setWidth(dp(w)).build()

    private fun layout(s: Snap): LayoutElement {
        val now = System.currentTimeMillis()
        val cur = s.current
        val col = Column.Builder().setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
        val head = Column.Builder()
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(launch(WatchActivity::class.java)).build())
        if (s.empty) {
            head.addContent(text("☀ 하루 도우미", 15f, ACCENT, bold = true))
                .addContent(gap(4f))
                .addContent(text("폰에서 앱을 한 번 열어 주세요", 12f, GRAY, lines = 2))
        } else {
            head.addContent(text(if (s.focus != null || cur == null) "🎯 지금 할 일" else "📋 다음 할 일", 12f, AMBER, bold = true))
                .addContent(gap(2f))
                .addContent(text(cur?.text ?: "할 일이 없어요 👏", 16f, bold = true, lines = 2))
            val r = s.upcoming().firstOrNull()
            head.addContent(gap(4f))
            head.addContent(
                if (r == null) text("⏰ 알림 없음", 12f, GRAY)
                else text((if (r.at <= now) "🔔 " else "⏰ ") + Fmt.hm(r.at) + " " + r.text, 12f, if (r.at <= now) ROSE else GRAY)
            )
        }
        col.addContent(head.build())
            .addContent(gap(10f))
            .addContent(
                Row.Builder()
                    .setVerticalAlignment(LayoutElementBuilders.VERTICAL_ALIGN_CENTER)
                    .addContent(circle("🌬", TEAL, launch(BreathActivity::class.java)))
                    .addContent(hgap(8f))
                    .addContent(circle("💭", INDIGO, launch(WatchActivity::class.java, "memo")))
                    .addContent(hgap(8f))
                    .addContent(circle("🗣", AMBER_BG, launch(TalkActivity::class.java)))
                    .build()
            )
        return Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .setVerticalAlignment(LayoutElementBuilders.VERTICAL_ALIGN_CENTER)
            .addContent(col.build())
            .build()
    }

    companion object {
        private const val WHITE = 0xFFFFFFFF.toInt()
        private const val GRAY = 0xFFB4B2C8.toInt()
        private const val ACCENT = 0xFF9B9BFF.toInt()
        private const val AMBER = 0xFFF3B14E.toInt()
        private const val AMBER_BG = 0xFFB45309.toInt()
        private const val ROSE = 0xFFFF7B9C.toInt()
        private const val TEAL = 0xFF0E7490.toInt()
        private const val INDIGO = 0xFF4F46E5.toInt()
    }
}
