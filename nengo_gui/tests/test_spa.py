import os
import sys
import time
import traceback
import pytest
from selenium.webdriver import ActionChains
from nengo_gui import conftest
from nengo_gui import testing_tools as tt

def set_cloud_value(driver,spa_nets):
    for name in spa_nets:
        prompt_script = """
        var items = Nengo.Component.components;
        items.forEach(function(pointer){
            if(pointer.label.innerHTML === '%s' && pointer.constructor === Nengo.Pointer){
                pointer.set_value();
        }});
        """
        time.sleep(0.6)
        driver.execute_script(prompt_script % name)
        field = driver.find_element_by_xpath("//*[@id='singleInput']")
        time.sleep(0.6)
        field.send_keys(spa_nets[name])
        accept = driver.find_element_by_xpath("//*[@id='OK']")
        time.sleep(0.3)
        accept.click()

def test_spa(driver):
    # Tests the functionality of SPA simulations

    try:
        #Test page response by clicking the reset button and applying new code to ace-editor
        test_file  = """
import nengo
import nengo.spa as spa

D = 2  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.color = spa.State(D)
    model.shape = spa.State(D)
    model.memory = spa.State(D, feedback=1)
    model.query = spa.State(D)
    model.answer = spa.State(D)

    actions = spa.Actions(
        "memory = color * shape",
        "answer = memory * ~query",
        )

    model.cortical = spa.Cortical(actions)
        """
        tt.reset_page(driver)
        tt.update_editor(driver, test_file)
        tt.mouse_scroll(driver,200)

        # Generates semantic pointer clouds for each network
        driver.execute_script("""
        var a = Nengo.netgraph.svg_objects;
        for(model in a){
            if(a[model].sp_targets.length > 0){
                a[model].create_graph('Pointer',a[model].sp_targets[0]);
                a[model].create_graph('SpaSimilarity',a[model].sp_targets[0]);
            }
        };
        """)
        time.sleep(1)
        # Ensures the simulation has started
        hang_time = 100 # alloted time until test fails
        compiled = False
        tt.start_stop_sim(driver)
        time_start = time.time()
        while(time.time() - time_start < hang_time):
        	time_script = 'var time = $("#ticks_tr"); \
        	return time.find("td").text()'
        	sim_time = driver.execute_script(time_script)
        	if(float(sim_time) > 0):
        		compiled = True
        		break
        	time.sleep(1)

        assert(compiled)

        # Sets the semantic pointers appropriately
        spa_values = {"shape":"CIRCLE", "color":"BLUE", "query":"CIRCLE"}
        set_cloud_value(driver,spa_values)
        time.sleep(10)
        result = driver.execute_script("""
        var objects = Nengo.Component.components;
        var answer = objects.filter(function(item){
              return item.label.innerHTML == "answer";}
        )[0];
        var answer_data = answer.data_store.data[0];
        var result = answer_data.pop();
        return result
        """)

        data_script = """
        shape_data = Nengo.Component.components.filter(function(item){
            return (item.constructor === Nengo.SpaSimilarity);
        })[0].data_store.data;
        return shape_data;
        """
        plot_data = driver.execute_script(data_script)

        # Checks that the 'answer' is BLUE
        assert(len(filter((lambda x: ("BLUE" in x)),result)) > 0)

        # Checks the dimensionality of the spa similarity plot
        assert(len(plot_data) == 2 and len(plot_data[0]) > 1)

        set_cloud_value(driver,{"color":"ORANGE"})

        time.sleep(5)

        plot_data = driver.execute_script(data_script)

        # Checks that the data store grows when input changes
        assert(len(plot_data) == 3 and len(plot_data[0]) > 1)

    except Exception as e:
        #Travis Only: On fail takes screenshot and uploads it to imgur


        if('TRAVIS' in os.environ):
        	tt.imgur_screenshot(driver)

        _, _, tb = sys.exc_info()
        traceback.print_tb(tb) # Fixed format
        tb_info = traceback.extract_tb(tb)
        filename, line, func, text = tb_info[-1]

        print('An error occurred on line {} in statement {}'.format(line, text))
        print(str(e))
        exit(1)
