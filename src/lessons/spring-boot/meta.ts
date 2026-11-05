import type { TopicMeta } from '../types';

export const meta: TopicMeta = {
  topic: 'spring-boot',
  title: 'Spring Boot',
  group: 'Spring',
  summary: 'Spring MVC 요청 처리, `@Transactional` proxy, bean lifecycle, auto-configuration을 소스 코드 수준에서 따라갑니다.',
  order: 1,
  // Checked on spring.io (Spring Boot 4.1.2) and in spring-boot v4.1.2 gradle.properties
  // (springFrameworkVersion=7.0.10, tomcatVersion=11.0.27).
  versions: {
    'Spring Boot': '4.1.2',
    'Spring Framework': '7.0.10',
    'Apache Tomcat': '11.0.27',
  },
  checkedOn: '2026-11-03',
  lessons: ['request-flow'],
  // One map for every Spring lesson, laid out in ground-grid cells (decision 0016): the request
  // runs along gx (outside → inside, caller → callee), the lookup sits one cell
  // back, the conversions one cell forward. The Tomcat JVM slab holds every in-process node; the
  // client and the database are other processes. service, repository, and database are for later
  // lessons (@Transactional).
  layout: {
    nodes: [
      { id: 'client', label: 'Client', sublabel: 'HTTP/1.1', kind: 'client', icon: 'laptop', gx: 0, gy: 0 },
      { id: 'tomcat', label: 'Tomcat', sublabel: 'http-nio-8080', kind: 'container', icon: 'server', gx: 1, gy: 0 },
      { id: 'filters', label: 'Filter chain', sublabel: 'Servlet Filter', kind: 'container', icon: 'filter-stack', gx: 2, gy: 0 },
      { id: 'dispatcher', label: 'DispatcherServlet', sublabel: 'doDispatch()', kind: 'framework', icon: 'hub', gx: 3, gy: 0 },
      { id: 'mapping', label: 'HandlerMapping', sublabel: 'getHandler()', kind: 'framework', icon: 'index', gx: 3, gy: -1 },
      { id: 'adapter', label: 'HandlerAdapter', sublabel: 'handle()', kind: 'framework', icon: 'adapter', gx: 4, gy: 0 },
      { id: 'resolver', label: '@RequestBody', sublabel: 'HttpMessageConverter', kind: 'framework', icon: 'converter', gx: 4, gy: 1 },
      { id: 'controller', label: 'OrderController', sublabel: '@RestController', kind: 'app', icon: 'controller', gx: 5, gy: 0 },
      { id: 'returns', label: '@ResponseBody', sublabel: 'HttpMessageConverter', kind: 'framework', icon: 'converter', gx: 5, gy: 1 },
      { id: 'service', label: 'OrderService', sublabel: '@Service', kind: 'app', icon: 'service', gx: 6, gy: 0 },
      { id: 'repository', label: 'OrderRepository', sublabel: '@Repository', kind: 'app', icon: 'repository', gx: 7, gy: 0 },
      { id: 'database', label: 'Database', sublabel: 'JDBC', kind: 'storage', icon: 'database', gx: 8, gy: 0 },
    ],
    regions: [
      {
        id: 'jvm',
        label: 'Tomcat JVM process',
        nodes: ['tomcat', 'filters', 'dispatcher', 'mapping', 'adapter', 'resolver', 'controller', 'returns', 'service', 'repository'],
      },
    ],
  },
};
