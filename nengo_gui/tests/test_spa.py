import os
import sys
import time
import traceback
import pytest
from selenium.webdriver import ActionChains
from nengo_gui import conftest
from nengo_gui import testing_tools as tt


test_files = tt.folder_location('examples/tutorial',"24-spa-unbinding.py")

@pytest.mark.parametrize('test_file', test_files[:])
def test_spa(driver, test_file):
    # Tests the functionality of SPA simulations

    try:
        #Test page response by clicking the reset button and applying new code to ace-editor

        tt.reset_page(driver)
        tt.update_editor(driver, test_file)
        tt.mouse_scroll(driver,200)

        # Generates semantic pointer clouds for each network
        driver.execute_script("""
        var a = Nengo.netgraph.svg_objects;
        for(model in a){
            if(a[model].sp_targets.length > 0){
                a[model].create_graph('Pointer',a[model].sp_targets[0]);
            }
        };
        """)
        time.sleep(1)
        # Ensures the simulation has started
        hang_time = 65 # alloted time until test fails
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
        inputs = ["shape","color","query"]
        for name in inputs:
            prompt_script = """
            var items = Nengo.Component.components;
            items.forEach(function(pointer){
                if(pointer.label.innerHTML == '%s'){
                    pointer.set_value();
            }});
            """
            time.sleep(0.6)
            driver.execute_script(prompt_script % name)
            field = driver.find_element_by_xpath("//*[@id='singleInput']")
            time.sleep(0.6)
            if(name == "shape"):
                field.send_keys("CIRCLE")
            elif(name == "color"):
                field.send_keys("RED")
            else:
                field.send_keys("CIRCLE")
            accept = driver.find_element_by_xpath("//*[@id='OK']")
            time.sleep(0.3)
            accept.click()
        time.sleep(15)
        result = driver.execute_script("""
        var objects = Nengo.Component.components;
        var answer = objects.filter(function(item){
              return item.label.innerHTML == "answer";}
        )[0];
        var answer_data = answer.data_store.data[0];
        var result = answer_data.pop()[0];
        return result
        """)
        assert("RED" in result and float(result[:4]) > 0.4)

    except Exception, e:
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
