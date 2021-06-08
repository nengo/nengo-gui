import nengo
import nengo.spa as spa

D = 16

model = spa.SPA(seed=1)
with model:
    model.a = spa.Buffer(dimensions=D)
    model.b = spa.Buffer(dimensions=D)
    model.c = spa.Buffer(dimensions=D)
    model.cortical = spa.Cortical(
        spa.Actions(
            "c = a+b",
        )
    )

    model.input = spa.Input(
        a="A",
        b=(lambda t: "C*~A" if (t % 0.1 < 0.05) else "D*~A"),
    )

if __name__ == "__main__":
    import nengo_gui

    nengo_gui.GUI(__file__).start()
