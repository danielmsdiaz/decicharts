import { use as register } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { DataZoomComponent, GraphicComponent, GridComponent, MarkLineComponent, MarkPointComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

register([LineChart, DataZoomComponent, GraphicComponent, GridComponent, MarkLineComponent, MarkPointComponent, TitleComponent, TooltipComponent, CanvasRenderer, SVGRenderer])
export { init } from 'echarts/core'
