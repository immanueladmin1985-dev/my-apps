package kr.immanuel.relay

import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
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

/** 워치 타일: 스코어, 이닝, 볼카운트, 주자, 마지막 플레이. */
class ScoreTileService : TileService() {

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val b = Board.load(this)
        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion("1")
            .setFreshnessIntervalMillis(if (b.live) 60_000 else 0)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(b)))
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

    private fun layout(b: Board): LayoutElement {
        val col = Column.Builder().setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
        if (b.empty) {
            col.addContent(text("⚾ 야구 중계", 16f, bold = true))
                .addContent(gap(6f))
                .addContent(text("폰 앱에서 감시를 시작하면\n여기에 스코어가 나옵니다.", 12f, GRAY, lines = 3))
        } else {
            col.addContent(text(b.inning, 13f, ACCENT, bold = true))
                .addContent(gap(2f))
                .addContent(
                    Row.Builder()
                        .setVerticalAlignment(LayoutElementBuilders.VERTICAL_ALIGN_CENTER)
                        .addContent(text(b.awayShort, 15f, GRAY))
                        .addContent(Spacer.Builder().setWidth(dp(8f)).build())
                        .addContent(text(b.score, 30f, bold = true))
                        .addContent(Spacer.Builder().setWidth(dp(8f)).build())
                        .addContent(text(b.homeShort, 15f, GRAY))
                        .build()
                )
            if (b.live) {
                col.addContent(gap(2f))
                    .addContent(text("${b.ball}B ${b.strike}S ${b.out}O   ${b.bases}", 13f))
            }
            if (b.lastText.isNotBlank()) {
                col.addContent(gap(6f)).addContent(text(b.lastText, 11f, GRAY, lines = 2))
            }
        }
        val open = ModifiersBuilders.Clickable.Builder()
            .setId("open")
            .setOnClick(
                ActionBuilders.LaunchAction.Builder()
                    .setAndroidActivity(
                        ActionBuilders.AndroidActivity.Builder()
                            .setPackageName(packageName)
                            .setClassName(WatchActivity::class.java.name)
                            .build()
                    ).build()
            ).build()
        return LayoutElementBuilders.Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .setVerticalAlignment(LayoutElementBuilders.VERTICAL_ALIGN_CENTER)
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(open).build())
            .addContent(col.build())
            .build()
    }

    companion object {
        private const val WHITE = 0xFFFFFFFF.toInt()
        private const val GRAY = 0xFFB0B8C4.toInt()
        private const val ACCENT = 0xFF6FB1FF.toInt()
    }
}
