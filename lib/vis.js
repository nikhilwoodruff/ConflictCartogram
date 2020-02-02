const colors = colorbrewer.RdYlBu[3]
	.reverse()
	.map(function(rgb) { return d3.hsl(rgb); });
const body = d3.select("body"),
	stat = d3.select("#status");
const map = d3.select("#map");
const layer = map.append("g")
    .attr("id", "layer");
let currentYear = 1989;
let states = layer.append("g")
	.attr("id", "states")
	.selectAll("path");
const proj = d3.geo.stereographic();
let tooltip = d3.select("#tooltip");
let topology,
	geometries,
	rawData,
	dataById = {};
const carto = d3.cartogram()
	.projection(proj)
	.properties(function(d) {
		return dataById[d.id];
	})
	.value(function(d) {
		return +d.properties[field];
	});
const url = "data/topology.topojson";
d3.json(url, function(topo) {
	topology = topo;
	geometries = topology.objects.countries.geometries;
	d3.csv("data/world_data.csv", function(data) {
		rawData = data;
		dataById = d3.nest()
			.key(function(d) { return d.ID; })
			.rollup(function(d) { return d[0]; })
			.map(data);
		init();
	});
});
function tooltipAppear(d) {
    try {
        tooltip.text(d.properties.NAME + ": " + d.properties[currentYear]);
    } catch(err) {
    }
    tooltip.transition().style("opacity", 1);
}
function tooltipDisappear(d) {
    tooltip.transition().style("opacity", 0);
}
async function init() {
	const features = carto.features(topology, geometries),
		path = d3.geo.path()
			.projection(proj);
	states = states.data(features)
		.enter()
		.append("path")
		.attr("class", "state")
		.attr("id", function(d) {
			try {
				return d.properties.ID;
			} catch(err) {
				return "no";
			}
		})
		.attr("fill", "#fafafa")
        .attr("d", path)
        .on("mouseover", tooltipAppear)
        .on("mouseout", tooltipDisappear);
    for(i = 0; i < 29; i++) {
        update(i + 1989);
        await sleep(300);
        d3.select('#yearDisplay').text(i + 1989);
        currentYear += 1;
        await sleep(700);
        if(i == 28) {
            d3.select('#yearDisplay').text("RESTARTING");
            await sleep(2000);
            i = 0;
        }
    }
}
function update(year) {
	body.classed("updating", true);
	value = function(d) {
		try {
			return +d.properties[year];
		} catch(err) {
			return 0;
		}
	},
	values = states.data()
		.map(value)
		.filter(function(n) {
			return !isNaN(n);
		})
		.sort(d3.ascending),
	lo = values[0],
	hi = values[values.length - 1];
	const color = d3.scale.linear()
		.range(colors)
		.domain(lo < 0
			? [lo, 0, hi]
			: [lo, d3.mean(values), hi]);
	const scale = d3.scale.linear()
		.domain([lo, hi])
		.range([1, 1000]);
	carto.value(function(d) {
		return scale(value(d));
	});
	const features = carto(topology, geometries).features;
	states.data(features)
		.select("title")
		.text(function(d) {
			try {
				return [d.properties.NAME, fmt(value(d))].join(": ");
			} catch(err) {
				return ["no", "no"];
			}
		});
	states.transition()
		.duration(1000)
		.ease("exp-in-out")
		.attr("fill", function(d) {
			return color(value(d));
		})
		.attr("d", carto.path);
	body.classed("updating", false);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
