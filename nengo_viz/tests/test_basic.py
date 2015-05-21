def test_pageload(driver):
    assert "localhost" in driver.title
    assert "viz.js" in driver.page_source

