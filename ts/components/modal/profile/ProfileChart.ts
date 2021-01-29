class ProfileChart {
    public static get(type: string, options): AbstractChartBuilder {
        let chartBuilder: AbstractChartBuilder;
        switch (type) {
            case "bar":
                chartBuilder = new BarChartBuilder("profileModal", options);
                break;
            case "pie":
                chartBuilder = new PieChartBuilder("profileModal", options);
                break;
            default:
                throw new Error("unsupported chart!");
        }
        return chartBuilder;
    }
}