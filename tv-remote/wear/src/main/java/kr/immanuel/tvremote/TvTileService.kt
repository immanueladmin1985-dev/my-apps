package kr.immanuel.tvremote

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

/**
 * 워치 타일: 모드 버튼 4개. 누르면 앱을 열지 않고 폰에 실행을 부탁한다.
 * (누른 버튼 id 가 다음 타일 요청의 lastClickableId 로 온다)
 */
class TvTileService : TileService() {

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val clicked = requestParams.currentState.lastClickableId
        var note: String? = null
        if (clicked.startsWith(RUN)) {
            val id = clicked.removePrefix(RUN)
            val name = WStore.modes(this).firstOrNull { it.id == id }?.name ?: "모드"
            note = "▶ $name 요청"
            WStore.save(this, null, note)
            WStore.send(this, "/tv/run", id)
        }
        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion("1")
            .setFreshnessIntervalMillis(30 * 60_000L)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(note ?: WStore.last(this))))
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
                FontStyle.Builder().setSize(sp(size)).setColor(argb(color))
                    .setWeight(if (bold) LayoutElementBuilders.FONT_WEIGHT_BOLD else LayoutElementBuilders.FONT_WEIGHT_NORMAL)
                    .build()
            ).build()

    private fun gap(h: Float): LayoutElement = Spacer.Builder().setHeight(dp(h)).build()
    private fun hgap(w: Float): LayoutElement = Spacer.Builder().setWidth(dp(w)).build()

    private fun runClick(id: String) = ModifiersBuilders.Clickable.Builder()
        .setId(RUN + id)
        .setOnClick(ActionBuilders.LoadAction.Builder().build())
        .build()

    private fun openApp() = ModifiersBuilders.Clickable.Builder()
        .setId("open")
        .setOnClick(
            ActionBuilders.LaunchAction.Builder().setAndroidActivity(
                ActionBuilders.AndroidActivity.Builder().setPackageName(packageName).setClassName(WatchActivity::class.java.name).build()
            ).build()
        ).build()

    private fun button(label: String, click: ModifiersBuilders.Clickable): LayoutElement =
        Box.Builder()
            .setWidth(dp(76f)).setHeight(dp(44f))
            .setModifiers(
                ModifiersBuilders.Modifiers.Builder().setClickable(click).setBackground(
                    ModifiersBuilders.Background.Builder().setColor(argb(BLUE))
                        .setCorner(ModifiersBuilders.Corner.Builder().setRadius(dp(22f)).build()).build()
                ).build()
            )
            .addContent(text(label, 12f, bold = true, lines = 2))
            .build()

    private fun layout(status: String): LayoutElement {
        val modes = WStore.modes(this).take(4)
        val col = Column.Builder().setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
        col.addContent(
            Box.Builder().setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(openApp()).build())
                .addContent(text("📺 TV 한번에", 13f, GOLD, bold = true)).build()
        )
        col.addContent(gap(6f))
        if (modes.isEmpty()) {
            col.addContent(text("폰에서 앱을 한 번 열어 주세요", 12f, GRAY, lines = 2))
        } else {
            modes.chunked(2).forEachIndexed { i, pair ->
                if (i > 0) col.addContent(gap(6f))
                val row = Row.Builder()
                pair.forEachIndexed { j, m ->
                    if (j > 0) row.addContent(hgap(6f))
                    row.addContent(button("${m.emoji} ${m.name}", runClick(m.id)))
                }
                col.addContent(row.build())
            }
        }
        if (status.isNotEmpty()) {
            col.addContent(gap(6f))
            col.addContent(text(status, 10f, GRAY, lines = 2))
        }
        return Box.Builder()
            .setWidth(expand()).setHeight(expand())
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .setVerticalAlignment(LayoutElementBuilders.VERTICAL_ALIGN_CENTER)
            .addContent(col.build())
            .build()
    }

    companion object {
        private const val RUN = "run:"
        private const val WHITE = 0xFFFFFFFF.toInt()
        private const val GRAY = 0xFFB4B9C8.toInt()
        private const val GOLD = 0xFFFFC83D.toInt()
        private const val BLUE = 0xFF2D5FC2.toInt()
    }
}
