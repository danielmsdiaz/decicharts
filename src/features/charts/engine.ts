import { use as register } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { DataZoomComponent, GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

register([LineChart, DataZoomComponent, GridComponent, TitleComponent, TooltipComponent, CanvasRenderer, SVGRenderer])
export { init } from 'echarts/core'
